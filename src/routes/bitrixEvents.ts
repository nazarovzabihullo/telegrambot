import type { Request, Response } from 'express';
import { bot } from '../bot';
import { telegramIdFromChatId } from '../services/bitrixConnector';
import { clearInstall } from '../services/bitrixAuth';

interface IncomingMessage {
  chat?: { id?: string };
  message?: { text?: string };
}

/**
 * Handles events Bitrix24 posts to us after event.bind:
 * - ONIMCONNECTORMESSAGEADD: an operator replied in Open Lines -> relay to Telegram.
 * - ONAPPUNINSTALL: the local application was removed -> drop stored tokens.
 *
 * Always resolves 200 quickly; a failure here must never surface to Bitrix as
 * a retryable error storm.
 */
export async function handleBitrixEvent(req: Request, res: Response): Promise<void> {
  const body = req.body as { event?: string; data?: Record<string, unknown> };
  const event = body.event;

  try {
    if (event === 'ONIMCONNECTORMESSAGEADD') {
      await relayOperatorReplies(body.data);
    } else if (event === 'ONAPPUNINSTALL') {
      clearInstall();
      console.log('[bitrix] App uninstalled, tokens cleared');
    } else {
      console.log('[bitrix] Unhandled event:', event);
    }
  } catch (error) {
    console.error('[bitrix] Event handling failed:', event, error instanceof Error ? error.message : error);
  }

  res.status(200).send('OK');
}

async function relayOperatorReplies(data: Record<string, unknown> | undefined): Promise<void> {
  const rawMessages = (data?.MESSAGES ?? []) as IncomingMessage[] | Record<string, IncomingMessage>;
  const messages = Array.isArray(rawMessages) ? rawMessages : Object.values(rawMessages);

  for (const item of messages) {
    const chatId = item.chat?.id;
    const text = item.message?.text;
    if (!chatId || !text) {
      continue;
    }

    const telegramId = telegramIdFromChatId(chatId);
    if (telegramId === null) {
      continue;
    }

    await bot.telegram.sendMessage(telegramId, text);
  }
}
