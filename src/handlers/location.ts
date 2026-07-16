import type { Context } from 'telegraf';
import { sendStoreLocation, sendStoreInfo, sendMainKeyboard } from '../services/telegram';

/**
 * Handles the "📍 Manzil" button press:
 * 1. Sends the Telegram location (map pin).
 * 2. Sends the formatted store info text.
 * 3. Re-shows the persistent keyboard.
 */
export async function handleLocation(ctx: Context): Promise<void> {
  await sendStoreLocation(ctx);
  await sendStoreInfo(ctx);
  await sendMainKeyboard(ctx, 'Yana kerak bo\u2019lsa, tugmani bosing.');
}
