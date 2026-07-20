"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBitrixEvent = handleBitrixEvent;
const bot_1 = require("../bot");
const bitrixConnector_1 = require("../services/bitrixConnector");
const bitrixAuth_1 = require("../services/bitrixAuth");
/**
 * Handles events Bitrix24 posts to us after event.bind:
 * - ONIMCONNECTORMESSAGEADD: an operator replied in Open Lines -> relay to Telegram.
 * - ONAPPUNINSTALL: the local application was removed -> drop stored tokens.
 *
 * Always resolves 200 quickly; a failure here must never surface to Bitrix as
 * a retryable error storm.
 */
async function handleBitrixEvent(req, res) {
    const body = req.body;
    const event = body.event;
    try {
        if (event === 'ONIMCONNECTORMESSAGEADD') {
            await relayOperatorReplies(body.data);
        }
        else if (event === 'ONAPPUNINSTALL') {
            (0, bitrixAuth_1.clearInstall)();
            console.log('[bitrix] App uninstalled, tokens cleared');
        }
        else {
            console.log('[bitrix] Unhandled event:', event);
        }
    }
    catch (error) {
        console.error('[bitrix] Event handling failed:', event, error instanceof Error ? error.message : error);
    }
    res.status(200).send('OK');
}
async function relayOperatorReplies(data) {
    const rawMessages = (data?.MESSAGES ?? []);
    const messages = Array.isArray(rawMessages) ? rawMessages : Object.values(rawMessages);
    for (const item of messages) {
        const chatId = item.chat?.id;
        const text = item.message?.text;
        if (!chatId || !text) {
            continue;
        }
        const telegramId = (0, bitrixConnector_1.telegramIdFromChatId)(chatId);
        if (telegramId === null) {
            continue;
        }
        await bot_1.bot.telegram.sendMessage(telegramId, text);
    }
}
