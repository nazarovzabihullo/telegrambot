import { Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from './config';
import { OPERATOR_BUTTON_TEXT, LOCATION_BUTTON_TEXT, BACK_BUTTON_TEXT } from './keyboard';
import { handleStart } from './handlers/start';
import { handleLocation } from './handlers/location';
import { handleOperator } from './handlers/operator';
import { handleBack } from './handlers/back';
import { forwardMessageToBitrix } from './services/bitrix';
import type { TelegramSender } from './services/bitrix';

export const bot = new Telegraf<Context>(config.botToken);

// ---- Menu commands -------------------------------------------------------
bot.start(handleStart);
bot.command('menu', handleStart);

// ---- Menu buttons ----------------------------------------------------------
// These must be registered before the catch-all text handler below,
// so their exact-match presses never get forwarded to Bitrix24.
bot.hears(OPERATOR_BUTTON_TEXT, handleOperator);
bot.hears(LOCATION_BUTTON_TEXT, handleLocation);
bot.hears(BACK_BUTTON_TEXT, handleBack);

// ---- Fallback: forward every other plain text message to Bitrix24 --------
// Runs only if none of the handlers above matched, so /start, /menu and
// all menu button presses (Operator, Manzil, Orqaga) never reach Bitrix
// as ordinary chat messages.
bot.on(message('text'), async (ctx) => {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const sender: TelegramSender = {
    telegramId: from.id,
    firstName: from.first_name,
    lastName: from.last_name,
    username: from.username,
  };

  await forwardMessageToBitrix(sender, ctx.message.text, ctx.message.message_id);
});

// ---- Global error handler ---------------------------------------------
// Prevents an unexpected error in any handler from crashing the process.
bot.catch((error, ctx) => {
  console.error(`[bot] Unhandled error for update ${ctx.update.update_id}:`, error);
});
