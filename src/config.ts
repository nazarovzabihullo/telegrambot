import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Strongly typed application configuration.
 * All values are read once at startup and validated so that the
 * rest of the application can rely on them being present and correct.
 */
export interface AppConfig {
  botToken: string;
  webhookUrl: string;
  webhookPath: string;
  port: number;
  store: {
    name: string;
    phone: string;
    latitude: number;
    longitude: number;
    yandexMapsUrl: string;
  };
  bitrixClientId: string;
  bitrixClientSecret: string;
  bitrixLineId: number;
  bitrixInstallPath: string;
  bitrixEventsPath: string;
  tokenStorePath: string;
}

/**
 * Reads a required environment variable or throws a descriptive error.
 * Failing fast on missing configuration is safer than starting the bot
 * in a half-broken state.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * Parses a required environment variable as a float, throwing if invalid.
 */
function requireFloatEnv(name: string): number {
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
function requireIntEnv(name: string): number {
  const raw = requireEnv(name);
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a valid integer, got "${raw}"`);
  }
  return value;
}

function buildConfig(): AppConfig {
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
    bitrixInstallPath: '/bitrix/install',
    bitrixEventsPath: '/bitrix/events',
    tokenStorePath: path.join(process.cwd(), 'data', 'bitrix-tokens.json'),
  };
}

export const config: AppConfig = buildConfig();
