import type { Context } from 'telegraf';
import { config } from '../config';
import { mainKeyboard, backKeyboard } from '../keyboard';

/**
 * Sends the store's Telegram location (map pin) to the user.
 */
export async function sendStoreLocation(ctx: Context): Promise<void> {
  await ctx.sendLocation(config.store.latitude, config.store.longitude);
}

/**
 * Sends the formatted store info message (name, phone).
 */
export async function sendStoreInfo(ctx: Context): Promise<void> {
  const { name, phone } = config.store;

  const message = [`📍 ${name}`, `📞 ${phone}`].join('\n');

  await ctx.reply(message);
}

/**
 * Re-shows the persistent main reply keyboard (Operator + Manzil buttons).
 */
export async function sendMainKeyboard(ctx: Context, text: string): Promise<void> {
  await ctx.reply(text, mainKeyboard());
}

/**
 * Shows the "Orqaga" (back) keyboard, used after the operator screen.
 */
export async function sendBackKeyboard(ctx: Context, text: string): Promise<void> {
  await ctx.reply(text, backKeyboard());
}
