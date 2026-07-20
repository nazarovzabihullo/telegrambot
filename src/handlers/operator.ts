import type { Context } from 'telegraf';
import { sendBackKeyboard } from '../services/telegram';
import { forwardMessageToBitrix, senderFromCtx } from '../services/bitrix';

/**
 * Handles the "👨‍💼 Operator bilan bog'lanish" button press.
 * Immediately forwards a system notice to Bitrix24 so the chat/appeal opens
 * right away — some users press this button and then never type anything,
 * so waiting for their next message would leave the operator unaware they
 * wanted to talk at all.
 */
export async function handleOperator(ctx: Context): Promise<void> {
  const sender = senderFromCtx(ctx);
  if (sender) {
    const messageId = ctx.message?.message_id ?? Math.floor(Date.now() / 1000);
    await forwardMessageToBitrix(
      sender,
      "🔔 Foydalanuvchi operator bilan bog'lanishni so'radi.",
      messageId
    );
  }

  await sendBackKeyboard(
    ctx,
    "🔄 Operator bilan bog'lanmoqda...\n\nIltimos, xabaringizni yozing, operator tez orada javob beradi."
  );
}
