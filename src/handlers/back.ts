import type { Context } from 'telegraf';
import { sendMainKeyboard } from '../services/telegram';

/**
 * Handles the "⬅️ Orqaga" button press: returns the user to the
 * main menu (Operator + Manzil buttons).
 */
export async function handleBack(ctx: Context): Promise<void> {
  await sendMainKeyboard(ctx, "Asosiy menyu \u{1F447}");
}
