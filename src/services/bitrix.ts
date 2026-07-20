import type { Context } from 'telegraf';
import { config } from '../config';
import { sendMessageToBitrix } from './bitrixConnector';
import type { BitrixSender } from './bitrixConnector';

export type TelegramSender = BitrixSender;

/** Builds a TelegramSender from a Telegraf context, or null if it has no `from` (shouldn't normally happen). */
export function senderFromCtx(ctx: Context): TelegramSender | null {
  const from = ctx.from;
  if (!from) {
    return null;
  }
  return {
    telegramId: from.id,
    firstName: from.first_name,
    lastName: from.last_name,
    username: from.username,
  };
}

/**
 * Forwards one plain-text Telegram message into the Bitrix24 Open Lines chat
 * for that user, via our registered imconnector. Must never throw: a Bitrix
 * outage should never crash or block the bot for the Telegram user.
 */
export async function forwardMessageToBitrix(
  sender: TelegramSender,
  text: string,
  messageId: number
): Promise<void> {
  try {
    await sendMessageToBitrix(config.bitrixLineId, sender, text, messageId);
  } catch (error) {
    console.error(
      '[bitrix] Failed to forward message',
      JSON.stringify({ telegramId: sender.telegramId, error: error instanceof Error ? error.message : error })
    );
  }
}
