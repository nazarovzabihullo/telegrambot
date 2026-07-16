import type { Context } from 'telegraf';
import { sendBackKeyboard } from '../services/telegram';

/**
 * Handles the "👨‍💼 Operator bilan bog'lanish" button press.
 * This does NOT connect to Bitrix24 or do anything beyond showing
 * a status message and the "Orqaga" (back) keyboard — the actual
 * operator connection/queueing is handled entirely on the Bitrix24
 * Open Lines side once the user's next message is forwarded there.
 */
export async function handleOperator(ctx: Context): Promise<void> {
  await sendBackKeyboard(
    ctx,
    "🔄 Operator bilan bog'lanmoqda...\n\nIltimos, xabaringizni yozing, operator tez orada javob beradi."
  );
}
