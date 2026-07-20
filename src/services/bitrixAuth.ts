import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config';

/** Persisted OAuth state for the installed Bitrix24 local application. */
interface StoredTokens {
  domain: string;
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
  domain: string;
  memberId: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}): void {
  const tokens: StoredTokens = {
    domain: params.domain,
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
  const response = await axios.get(`https://${tokens.domain}/oauth/token/`, {
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
    domain: string;
    member_id: string;
  };

  const refreshed: StoredTokens = {
    domain: data.domain ?? tokens.domain,
    memberId: data.member_id ?? tokens.memberId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  cached = refreshed;
  writeToDisk(refreshed);
  return refreshed;
}

/** Returns a currently-valid access token + portal domain, refreshing if needed. */
export async function getValidTokens(): Promise<{ domain: string; accessToken: string }> {
  let tokens = loadTokens();
  if (Date.now() >= tokens.expiresAt) {
    tokens = await refresh(tokens);
  }
  return { domain: tokens.domain, accessToken: tokens.accessToken };
}

/**
 * Calls a Bitrix24 REST method authenticated as the installed local application,
 * refreshing the access token and retrying once if Bitrix reports it as expired.
 */
export async function callBitrixMethod<T = unknown>(
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  const { domain, accessToken } = await getValidTokens();
  const url = `https://${domain}/rest/${method}.json`;

  const post = (token: string) =>
    axios.post(url, { ...params, auth: token }, { timeout: 10_000 });

  let response = await post(accessToken);

  if (response.data?.error === 'expired_token') {
    const tokens = loadTokens();
    const refreshed = await refresh(tokens);
    response = await post(refreshed.accessToken);
  }

  if (response.data?.error) {
    throw new Error(
      `[bitrix] ${method} failed: ${response.data.error} - ${response.data.error_description ?? ''}`
    );
  }

  return response.data.result as T;
}
