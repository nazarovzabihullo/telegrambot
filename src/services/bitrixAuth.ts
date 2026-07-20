import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config';

/**
 * Persisted OAuth state for the installed Bitrix24 local application.
 *
 * This portal uses Bitrix's newer install flow: instead of a portal DOMAIN,
 * it hands us a SERVER_ENDPOINT (e.g. https://oauth.bitrix24.tech/rest/) that
 * all REST calls must go through, and a member_id identifying the portal.
 */
interface StoredTokens {
  serverEndpoint: string;
  memberId: string;
  accessToken: string;
  refreshToken: string;
  /** Unix ms timestamp after which the access token should be refreshed. */
  expiresAt: number;
}

let cached: StoredTokens | null = null;

function readFromDisk(): StoredTokens | null {
  if (!fs.existsSync(config.tokenStorePath)) {
    return null;
  }
  const raw = fs.readFileSync(config.tokenStorePath, 'utf8');
  return JSON.parse(raw) as StoredTokens;
}

function writeToDisk(tokens: StoredTokens): void {
  fs.mkdirSync(path.dirname(config.tokenStorePath), { recursive: true });
  fs.writeFileSync(config.tokenStorePath, JSON.stringify(tokens, null, 2), 'utf8');
}

/**
 * Called from the /bitrix/install handler with the tokens Bitrix hands us
 * during the local-application install handshake.
 */
export function saveInstall(params: {
  serverEndpoint: string;
  memberId: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}): void {
  const tokens: StoredTokens = {
    serverEndpoint: params.serverEndpoint,
    memberId: params.memberId,
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    // Refresh a little early to avoid racing against expiry.
    expiresAt: Date.now() + (params.expiresInSeconds - 60) * 1000,
  };
  cached = tokens;
  writeToDisk(tokens);
}

/** Clears stored tokens, e.g. on ONAPPUNINSTALL. */
export function clearInstall(): void {
  cached = null;
  if (fs.existsSync(config.tokenStorePath)) {
    fs.unlinkSync(config.tokenStorePath);
  }
}

function loadTokens(): StoredTokens {
  if (cached) {
    return cached;
  }
  const fromDisk = readFromDisk();
  if (!fromDisk) {
    throw new Error(
      'Bitrix24 app is not installed yet: no tokens on disk. Install the local application first.'
    );
  }
  cached = fromDisk;
  return cached;
}

async function refresh(tokens: StoredTokens): Promise<StoredTokens> {
  // The token endpoint lives on the same host as the REST server endpoint
  // (e.g. https://oauth.bitrix24.tech/oauth/token/).
  const oauthOrigin = new URL(tokens.serverEndpoint).origin;

  const response = await axios.get(`${oauthOrigin}/oauth/token/`, {
    params: {
      grant_type: 'refresh_token',
      client_id: config.bitrixClientId,
      client_secret: config.bitrixClientSecret,
      refresh_token: tokens.refreshToken,
    },
    timeout: 10_000,
  });

  const data = response.data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    server_endpoint?: string;
    member_id: string;
  };

  const refreshed: StoredTokens = {
    serverEndpoint: data.server_endpoint ?? tokens.serverEndpoint,
    memberId: data.member_id ?? tokens.memberId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  cached = refreshed;
  writeToDisk(refreshed);
  return refreshed;
}

/** Returns a currently-valid access token + REST server endpoint, refreshing if needed. */
export async function getValidTokens(): Promise<{ serverEndpoint: string; accessToken: string }> {
  let tokens = loadTokens();
  if (Date.now() >= tokens.expiresAt) {
    tokens = await refresh(tokens);
  }
  return { serverEndpoint: tokens.serverEndpoint, accessToken: tokens.accessToken };
}

/**
 * Calls a Bitrix24 REST method authenticated as the installed local application,
 * refreshing the access token and retrying once if Bitrix reports it as expired.
 */
export async function callBitrixMethod<T = unknown>(
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  const { serverEndpoint, accessToken } = await getValidTokens();

  // Bitrix returns error details as a JSON body even on non-2xx status codes
  // (e.g. 404 for an unknown method, 401 for a bad token). Accepting any
  // status here means response.data is always populated, so the error
  // handling below can surface Bitrix's actual error code/description
  // instead of axios's generic "Request failed with status code N".
  const post = (url: string, token: string) =>
    axios.post(
      url,
      { ...params, auth: token },
      { timeout: 10_000, validateStatus: () => true }
    );

  const gatewayUrl = `${serverEndpoint}${method}.json`;
  let response = await post(gatewayUrl, accessToken);

  if (response.data?.error === 'expired_token') {
    const tokens = loadTokens();
    const refreshed = await refresh(tokens);
    response = await post(gatewayUrl, refreshed.accessToken);
  }

  // The SERVER_ENDPOINT gateway doesn't proxy every REST namespace yet
  // (observed for imconnector.* on this portal) — fall back to calling the
  // classic portal-domain REST endpoint with the same access token.
  if (response.data?.error === 'ERROR_METHOD_NOT_FOUND') {
    const domainUrl = `https://${config.bitrixPortalDomain}/rest/${method}.json`;
    console.warn(`[bitrix] ${method} not found on gateway, retrying via ${domainUrl}`);
    response = await post(domainUrl, accessToken);
  }

  if (response.data?.error) {
    throw new Error(
      `[bitrix] ${method} failed (HTTP ${response.status}): ${response.data.error} - ${response.data.error_description ?? ''}`
    );
  }

  return response.data.result as T;
}
