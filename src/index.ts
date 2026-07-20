import express from 'express';
import type { Request, Response } from 'express';
import { config } from './config';
import { bot } from './bot';
import { handleBitrixInstall } from './routes/bitrixInstall';
import { handleBitrixEvent } from './routes/bitrixEvents';

const app = express();

// Health-check / root route.
app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('Bot is running');
});

// Telegram webhook endpoint. Telegraf parses the raw request body itself,
// so this must be mounted before any global JSON body-parser middleware.
app.use(bot.webhookCallback(config.webhookPath));

// Bitrix24 local-application install handshake and Open Lines connector
// events. Bitrix has been observed sending either urlencoded or JSON
// bodies depending on portal/version, so both parsers are chained: each
// only acts when the request's Content-Type matches, so they never
// conflict with each other or with Telegraf's raw-body webhook above.
const bitrixBodyParsers = [express.json(), express.urlencoded({ extended: true })];
app.post(config.bitrixInstallPath, ...bitrixBodyParsers, handleBitrixInstall);
app.post(config.bitrixEventsPath, ...bitrixBodyParsers, handleBitrixEvent);

// Connector placement handler: Bitrix requires this URL to exist (it's
// where a connector's settings UI would normally live), but our connector
// is fully configured automatically at install time, so it's just a stub.
const placementPage = (_req: Request, res: Response): void => {
  res.status(200).send('<html><body>Telegram connector — no settings needed here.</body></html>');
};
app.get(config.bitrixPlacementPath, placementPage);
app.post(config.bitrixPlacementPath, ...bitrixBodyParsers, placementPage);

/**
 * Registers the Telegram webhook so that Telegram starts delivering
 * updates to our Express endpoint. Called once on startup.
 */
async function registerWebhook(): Promise<void> {
  const fullWebhookUrl = `${config.webhookUrl}${config.webhookPath}`;
  await bot.telegram.setWebhook(fullWebhookUrl);
  console.log(`[startup] Webhook registered at ${fullWebhookUrl}`);
}

async function main(): Promise<void> {
  try {
    await registerWebhook();

    app.listen(config.port, () => {
      console.log(`[startup] Express server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('[startup] Failed to start the bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown so Telegraf can clean up (e.g. stop long polling
// if it was ever used) and the process exits cleanly under process
// managers like PM2/systemd/Docker.
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

void main();
