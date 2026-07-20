"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Reads a required environment variable or throws a descriptive error.
 * Failing fast on missing configuration is safer than starting the bot
 * in a half-broken state.
 */
function requireEnv(name) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value.trim();
}
/**
 * Parses a required environment variable as a float, throwing if invalid.
 */
function requireFloatEnv(name) {
    const raw = requireEnv(name);
    const value = Number.parseFloat(raw);
    if (Number.isNaN(value)) {
        throw new Error(`Environment variable ${name} must be a valid number, got "${raw}"`);
    }
    return value;
}
/**
 * Parses a required environment variable as an integer, throwing if invalid.
 */
function requireIntEnv(name) {
    const raw = requireEnv(name);
    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
        throw new Error(`Environment variable ${name} must be a valid integer, got "${raw}"`);
    }
    return value;
}
function buildConfig() {
    const botToken = requireEnv('BOT_TOKEN');
    const webhookUrl = requireEnv('WEBHOOK_URL').replace(/\/+$/, ''); // strip trailing slash
    const port = Number.parseInt(process.env.PORT ?? '3000', 10);
    // Use the bot token as part of the webhook path so that the endpoint
    // cannot be guessed / triggered by third parties.
    const webhookPath = `/webhook/${botToken}`;
    return {
        botToken,
        webhookUrl,
        webhookPath,
        port: Number.isNaN(port) ? 3000 : port,
        store: {
            name: requireEnv('STORE_NAME'),
            phone: requireEnv('STORE_PHONE'),
            latitude: requireFloatEnv('STORE_LATITUDE'),
            longitude: requireFloatEnv('STORE_LONGITUDE'),
            yandexMapsUrl: requireEnv('YANDEX_MAPS_URL'),
        },
        bitrixClientId: requireEnv('BITRIX_CLIENT_ID'),
        bitrixClientSecret: requireEnv('BITRIX_CLIENT_SECRET'),
        bitrixLineId: requireIntEnv('BITRIX_LINE_ID'),
        bitrixPortalDomain: requireEnv('BITRIX_PORTAL_DOMAIN'),
        bitrixInstallPath: '/bitrix/install',
        bitrixEventsPath: '/bitrix/events',
        bitrixPlacementPath: '/bitrix/placement',
        tokenStorePath: path_1.default.join(process.cwd(), 'data', 'bitrix-tokens.json'),
    };
}
exports.config = buildConfig();
