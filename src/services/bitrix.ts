import axios, { AxiosError } from 'axios';
import { config } from '../config';

/**
 * Minimal shape of a Telegram user needed to build a Bitrix24 payload.
 */
export interface TelegramSender {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

/** Internal shape used only for error logging. */
interface LogPayload {
  telegramId: number;
  firstName: string;
  username: string;
  text: string;
}

/**
 * In-memory store: telegramId → Bitrix24 Lead ID.
 *
 * On the first message from a user we create a CRM Lead and remember its ID.
 * Subsequent messages from the same user are added as timeline comments on
 * that same lead so the operator sees the full conversation in one card.
 *
 * The map is cleared on server restart, which causes a new lead to be created
 * for the first message after a restart — acceptable for a lightweight setup.
 */
const leadIdByTelegramId = new Map<number, number>();

/**
 * Main entry point called by the bot for every plain-text user message.
 *
 * This function must never throw: any network or API error is caught
 * and logged so that a Bitrix outage can never crash or block the bot.
 */
export async function forwardMessageToBitrix(
  sender: TelegramSender,
  text: string
): Promise<void> {
  const logPayload: LogPayload = {
    telegramId: sender.telegramId,
    firstName: sender.firstName,
    username: sender.username ?? 'no_username',
    text,
  };

  const existingLeadId = leadIdByTelegramId.get(sender.telegramId);

  if (existingLeadId) {
    // Subsequent message: add as a timeline comment on the existing lead.
    await addTimelineComment(existingLeadId, sender, text, logPayload);
  } else {
    // First message: create a new CRM lead.
    await createLead(sender, text, logPayload);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a new CRM Lead for the user's first message.
 * Stores the returned lead ID in the in-memory map.
 */
async function createLead(
  sender: TelegramSender,
  text: string,
  logPayload: LogPayload
): Promise<void> {
  const params = new URLSearchParams();
  params.append('fields[TITLE]', `Telegram: ${sender.firstName} (@${sender.username ?? 'no_username'})`);
  params.append('fields[NAME]', sender.firstName);
  if (sender.lastName) params.append('fields[LAST_NAME]', sender.lastName);
  params.append(
    'fields[COMMENTS]',
    `Telegram ID: ${sender.telegramId}\nUsername: @${sender.username ?? 'no_username'}\n\n${text}`
  );
  params.append('fields[SOURCE_ID]', 'OTHER');
  params.append(
    'fields[SOURCE_DESCRIPTION]',
    `Telegram bot | ID: ${sender.telegramId} | @${sender.username ?? 'no_username'}`
  );

  const url = `${config.bitrixWebhook}/crm.lead.add.json`;

  try {
    const response = await axios.post(url, params.toString(), {
      timeout: 10_000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data?.error) {
      console.error('[bitrix] crm.lead.add error', JSON.stringify({
        telegramId: logPayload.telegramId,
        error: response.data.error,
        error_description: response.data.error_description,
      }));
      return;
    }

    const leadId: number = response.data?.result;
    if (leadId) {
      leadIdByTelegramId.set(sender.telegramId, leadId);
      console.log('[bitrix] Lead created', JSON.stringify({ telegramId: logPayload.telegramId, leadId }));
    }
  } catch (error) {
    logBitrixError('crm.lead.add', error, logPayload);
  }
}

/**
 * Adds the user's subsequent messages as timeline comments on the existing lead.
 * This keeps the full conversation visible inside a single lead card.
 */
async function addTimelineComment(
  leadId: number,
  sender: TelegramSender,
  text: string,
  logPayload: LogPayload
): Promise<void> {
  const params = new URLSearchParams();
  params.append('fields[ENTITY_ID]', String(leadId));
  params.append('fields[ENTITY_TYPE]', 'lead');
  params.append(
    'fields[COMMENT]',
    `📩 @${sender.username ?? 'no_username'}: ${text}`
  );

  const url = `${config.bitrixWebhook}/crm.timeline.comment.add.json`;

  try {
    const response = await axios.post(url, params.toString(), {
      timeout: 10_000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data?.error) {
      console.error('[bitrix] crm.timeline.comment.add error', JSON.stringify({
        telegramId: logPayload.telegramId,
        leadId,
        error: response.data.error,
        error_description: response.data.error_description,
      }));
      return;
    }

    console.log('[bitrix] Timeline comment added', JSON.stringify({
      telegramId: logPayload.telegramId,
      leadId,
      commentId: response.data?.result,
    }));
  } catch (error) {
    logBitrixError('crm.timeline.comment.add', error, logPayload);
  }
}

/**
 * Logs a Bitrix forwarding failure without leaking the webhook secret.
 */
function logBitrixError(method: string, error: unknown, payload: LogPayload): void {
  if (error instanceof AxiosError) {
    console.error(
      '[bitrix] Failed to forward message',
      JSON.stringify({
        method,
        telegramId: payload.telegramId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    );
    return;
  }
  console.error('[bitrix] Unexpected error:', error);
}
