import type { Context } from 'telegraf';
import { sendMainKeyboard } from '../services/telegram';

/**
 * Handles /start and /menu commands: greets the user and shows the
 * single-button persistent reply keyboard.
 */
export async function handleStart(ctx: Context): Promise<void> {
  console.log('[bot] /start handled');
  await sendMainKeyboard(ctx, "Assalomu alaykum! Quyidagi tugmadan foydalaning \u{1F447}");
}
