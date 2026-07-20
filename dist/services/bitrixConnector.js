"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONNECTOR_ID = void 0;
exports.registerConnector = registerConnector;
exports.listOpenLines = listOpenLines;
exports.activateConnector = activateConnector;
exports.bindEvent = bindEvent;
exports.chatIdFor = chatIdFor;
exports.telegramIdFromChatId = telegramIdFromChatId;
exports.sendMessageToBitrix = sendMessageToBitrix;
const bitrixAuth_1 = require("./bitrixAuth");
/** Unique id for our custom Open Channels connector within the portal. */
exports.CONNECTOR_ID = 'telegram_location_bot';
/** 1x1 transparent PNG — placeholder connector icon, good enough for a private app. */
const PLACEHOLDER_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
/** Registers the connector so it shows up in Bitrix24 Contact Center. Idempotent. */
async function registerConnector() {
    await (0, bitrixAuth_1.callBitrixMethod)('imconnector.register', {
        ID: exports.CONNECTOR_ID,
        NAME: 'Telegram bot',
        ICON: {
            DATA_IMAGE: PLACEHOLDER_ICON_BASE64,
            DATA_IMAGE_ECONOM: PLACEHOLDER_ICON_BASE64,
        },
        ICON_DISABLED: {
            DATA_IMAGE: PLACEHOLDER_ICON_BASE64,
            DATA_IMAGE_ECONOM: PLACEHOLDER_ICON_BASE64,
        },
    });
}
/** Lists the portal's Open Lines (id + name) — handy for finding the right BITRIX_LINE_ID. */
async function listOpenLines() {
    return (0, bitrixAuth_1.callBitrixMethod)('imopenlines.config.list', {});
}
/** Attaches our connector to the given Open Line. Idempotent. */
async function activateConnector(lineId) {
    await (0, bitrixAuth_1.callBitrixMethod)('imconnector.activate', {
        CONNECTOR: exports.CONNECTOR_ID,
        LINE: lineId,
        ACTIVE: 1,
    });
}
/** Binds a Bitrix event to our HTTP handler. Re-binding the same pair is a no-op on Bitrix's side. */
async function bindEvent(eventName, handlerUrl) {
    await (0, bitrixAuth_1.callBitrixMethod)('event.bind', {
        EVENT: eventName,
        HANDLER: handlerUrl,
    });
}
/** The chat id we hand to Bitrix for a given Telegram user — reversible by stripping the prefix. */
function chatIdFor(telegramId) {
    return `tg_${telegramId}`;
}
/** Recovers the Telegram user id from a Bitrix chat id, or null if it isn't one of ours. */
function telegramIdFromChatId(chatId) {
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
async function sendMessageToBitrix(lineId, sender, text, messageId) {
    const displayName = [sender.firstName, sender.lastName].filter(Boolean).join(' ');
    await (0, bitrixAuth_1.callBitrixMethod)('imconnector.send.messages', {
        CONNECTOR: exports.CONNECTOR_ID,
        LINE: lineId,
        MESSAGES: [
            {
                user: {
                    id: chatIdFor(sender.telegramId),
                    name: displayName || sender.username || `Telegram ${sender.telegramId}`,
                    last_name: sender.lastName ?? '',
                },
                message: {
                    id: messageId,
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
