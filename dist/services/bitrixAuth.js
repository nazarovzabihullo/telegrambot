"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveInstall = saveInstall;
exports.clearInstall = clearInstall;
exports.getValidTokens = getValidTokens;
exports.callBitrixMethod = callBitrixMethod;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
let cached = null;
function readFromDisk() {
    if (!fs_1.default.existsSync(config_1.config.tokenStorePath)) {
        return null;
    }
    const raw = fs_1.default.readFileSync(config_1.config.tokenStorePath, 'utf8');
    return JSON.parse(raw);
}
function writeToDisk(tokens) {
    fs_1.default.mkdirSync(path_1.default.dirname(config_1.config.tokenStorePath), { recursive: true });
    fs_1.default.writeFileSync(config_1.config.tokenStorePath, JSON.stringify(tokens, null, 2), 'utf8');
}
/**
 * Called from the /bitrix/install handler with the tokens Bitrix hands us
 * during the local-application install handshake.
 */
function saveInstall(params) {
    const tokens = {
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
function clearInstall() {
    cached = null;
    if (fs_1.default.existsSync(config_1.config.tokenStorePath)) {
        fs_1.default.unlinkSync(config_1.config.tokenStorePath);
    }
}
function loadTokens() {
    if (cached) {
        return cached;
    }
    const fromDisk = readFromDisk();
    if (!fromDisk) {
        throw new Error('Bitrix24 app is not installed yet: no tokens on disk. Install the local application first.');
    }
    cached = fromDisk;
    return cached;
}
async function refresh(tokens) {
    const response = await axios_1.default.get(`https://${tokens.domain}/oauth/token/`, {
        params: {
            grant_type: 'refresh_token',
            client_id: config_1.config.bitrixClientId,
            client_secret: config_1.config.bitrixClientSecret,
            refresh_token: tokens.refreshToken,
        },
        timeout: 10000,
    });
    const data = response.data;
    const refreshed = {
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
async function getValidTokens() {
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
async function callBitrixMethod(method, params) {
    const { domain, accessToken } = await getValidTokens();
    const url = `https://${domain}/rest/${method}.json`;
    const post = (token) => axios_1.default.post(url, { ...params, auth: token }, { timeout: 10000 });
    let response = await post(accessToken);
    if (response.data?.error === 'expired_token') {
        const tokens = loadTokens();
        const refreshed = await refresh(tokens);
        response = await post(refreshed.accessToken);
    }
    if (response.data?.error) {
        throw new Error(`[bitrix] ${method} failed: ${response.data.error} - ${response.data.error_description ?? ''}`);
    }
    return response.data.result;
}
