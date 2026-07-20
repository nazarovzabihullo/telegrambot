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
// events. Each gets its own scoped urlencoded parser instead of a global
// one, so it never interferes with Telegraf's raw-body webhook above.
const bitrixBodyParser = express.urlencoded({ extended: true });
app.post(config.bitrixInstallPath, bitrixBodyParser, handleBitrixInstall);
app.post(config.bitrixEventsPath, bitrixBodyParser, handleBitrixEvent);

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
