import { config } from '../config';
import { callBitrixMethod } from './bitrixAuth';

/** Unique id for our custom Open Channels connector within the portal. */
export const CONNECTOR_ID = 'telegram_location_bot';

/** 1x1 transparent PNG — placeholder connector icon, good enough for a private app. */
const PLACEHOLDER_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export interface BitrixSender {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

/** Registers the connector so it shows up in Bitrix24 Contact Center. Idempotent. */
export async function registerConnector(): Promise<void> {
  await callBitrixMethod('imconnector.register', {
    ID: CONNECTOR_ID,
    NAME: 'Telegram bot',
    ICON: {
      DATA_IMAGE: PLACEHOLDER_ICON_BASE64,
      DATA_IMAGE_ECONOM: PLACEHOLDER_ICON_BASE64,
    },
    ICON_DISABLED: {
      DATA_IMAGE: PLACEHOLDER_ICON_BASE64,
      DATA_IMAGE_ECONOM: PLACEHOLDER_ICON_BASE64,
    },
    // Bitrix requires a placement handler URL even though our connector has
    // no real settings UI — everything is configured automatically at
    // install time. The page just needs to exist and return 200.
    PLACEMENT_HANDLER: `${config.webhookUrl}${config.bitrixPlacementPath}`,
  });
}

/** Lists the portal's Open Lines (id + name) — handy for finding the right BITRIX_LINE_ID. */
export async function listOpenLines(): Promise<Array<{ ID: string; LINE_NAME: string }>> {
  return callBitrixMethod('imopenlines.config.list.get', {
    PARAMS: {
      select: ['ID', 'LINE_NAME', 'ACTIVE'],
      order: { ID: 'ASC' },
      limit: 50,
      offset: 0,
    },
  });
}

/** Attaches our connector to the given Open Line. Idempotent. */
export async function activateConnector(lineId: number): Promise<void> {
  await callBitrixMethod('imconnector.activate', {
    CONNECTOR: CONNECTOR_ID,
    LINE: lineId,
    ACTIVE: 1,
  });
}

/**
 * Sets the channel data for our connector on the given line. Without this,
 * imconnector.send.messages reports SUCCESS but the message never actually
 * surfaces in the operator's Open Lines UI — this call is what tells Bitrix
 * "here is the channel messages will arrive on for this line". Must be
 * called once per line activation, with a stable DATA.ID per docs guidance.
 */
export async function setConnectorData(lineId: number): Promise<void> {
  await callBitrixMethod('imconnector.connector.data.set', {
    CONNECTOR: CONNECTOR_ID,
    LINE: lineId,
    DATA: {
      ID: `${CONNECTOR_ID}_line${lineId}`,
      NAME: 'Telegram bot',
    },
  });
}

/**
 * Binds a Bitrix event to our HTTP handler. Unlike register/activate, Bitrix
 * does NOT treat re-binding the same event+handler pair as a no-op — it
 * rejects it with "Handler already binded", which in practice just confirms
 * the binding from an earlier install is still in place. Since our local
 * token file can be wiped by a redeploy while Bitrix's own event-handler
 * table survives, that specific error is expected on re-install and treated
 * as success rather than a failure.
 */
export async function bindEvent(eventName: string, handlerUrl: string): Promise<void> {
  try {
    await callBitrixMethod('event.bind', {
      EVENT: eventName,
      HANDLER: handlerUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already binded')) {
      console.log(`[bitrix] ${eventName} was already bound, treating as success`);
      return;
    }
    throw error;
  }
}

/** The chat id we hand to Bitrix for a given Telegram user — reversible by stripping the prefix. */
export function chatIdFor(telegramId: number): string {
  return `tg_${telegramId}`;
}

/** Recovers the Telegram user id from a Bitrix chat id, or null if it isn't one of ours. */
export function telegramIdFromChatId(chatId: string): number | null {
  if (!chatId.startsWith('tg_')) {
    return null;
  }
  const id = Number.parseInt(chatId.slice('tg_'.length), 10);
  return Number.isNaN(id) ? null : id;
}

/**
 * Pushes one Telegram message into the Bitrix24 Open Lines chat for that user,
 * creating the chat on first contact and continuing it on subsequent messages.
 */
export async function sendMessageToBitrix(
  lineId: number,
  sender: BitrixSender,
  text: string,
  messageId: number
): Promise<void> {
  const displayName = [sender.firstName, sender.lastName].filter(Boolean).join(' ');

  await callBitrixMethod('imconnector.send.messages', {
    CONNECTOR: CONNECTOR_ID,
    LINE: lineId,
    MESSAGES: [
      {
        user: {
          id: chatIdFor(sender.telegramId),
          name: displayName || sender.username || `Telegram ${sender.telegramId}`,
          last_name: sender.lastName ?? '',
        },
        message: {
          id: String(messageId),
          date: Math.floor(Date.now() / 1000),
          text,
        },
        chat: {
          id: chatIdFor(sender.telegramId),
          name: `Telegram: ${displayName || sender.username || sender.telegramId}`,
        },
      },
    ],
  });
}
