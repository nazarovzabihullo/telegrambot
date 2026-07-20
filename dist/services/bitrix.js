"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.senderFromCtx = senderFromCtx;
exports.forwardMessageToBitrix = forwardMessageToBitrix;
const config_1 = require("../config");
const bitrixConnector_1 = require("./bitrixConnector");
/** Builds a TelegramSender from a Telegraf context, or null if it has no `from` (shouldn't normally happen). */
function senderFromCtx(ctx) {
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
async function forwardMessageToBitrix(sender, text, messageId) {
    try {
        await (0, bitrixConnector_1.sendMessageToBitrix)(config_1.config.bitrixLineId, sender, text, messageId);
    }
    catch (error) {
        console.error('[bitrix] Failed to forward message', JSON.stringify({ telegramId: sender.telegramId, error: error instanceof Error ? error.message : error }));
    }
}
