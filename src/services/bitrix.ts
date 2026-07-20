import { config } from '../config';
import { sendMessageToBitrix } from './bitrixConnector';
import type { BitrixSender } from './bitrixConnector';

export type TelegramSender = BitrixSender;

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
