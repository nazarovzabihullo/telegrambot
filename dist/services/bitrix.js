"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.forwardMessageToBitrix = forwardMessageToBitrix;
const axios_1 = __importStar(require("axios"));
const config_1 = require("../config");
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
const leadIdByTelegramId = new Map();
/**
 * Main entry point called by the bot for every plain-text user message.
 *
 * This function must never throw: any network or API error is caught
 * and logged so that a Bitrix outage can never crash or block the bot.
 */
async function forwardMessageToBitrix(sender, text) {
    const logPayload = {
        telegramId: sender.telegramId,
        firstName: sender.firstName,
        username: sender.username ?? 'no_username',
        text,
    };
    const existingLeadId = leadIdByTelegramId.get(sender.telegramId);
    if (existingLeadId) {
        // Subsequent message: add as a timeline comment on the existing lead.
        await addTimelineComment(existingLeadId, sender, text, logPayload);
    }
    else {
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
async function createLead(sender, text, logPayload) {
    const params = new URLSearchParams();
    params.append('fields[TITLE]', `Telegram: ${sender.firstName} (@${sender.username ?? 'no_username'})`);
    params.append('fields[NAME]', sender.firstName);
    if (sender.lastName)
        params.append('fields[LAST_NAME]', sender.lastName);
    params.append('fields[COMMENTS]', `Telegram ID: ${sender.telegramId}\nUsername: @${sender.username ?? 'no_username'}\n\n${text}`);
    params.append('fields[SOURCE_ID]', 'OTHER');
    params.append('fields[SOURCE_DESCRIPTION]', `Telegram bot | ID: ${sender.telegramId} | @${sender.username ?? 'no_username'}`);
    const url = `${config_1.config.bitrixWebhook}/crm.lead.add.json`;
    try {
        const response = await axios_1.default.post(url, params.toString(), {
            timeout: 10000,
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
        const leadId = response.data?.result;
        if (leadId) {
            leadIdByTelegramId.set(sender.telegramId, leadId);
            console.log('[bitrix] Lead created', JSON.stringify({ telegramId: logPayload.telegramId, leadId }));
        }
    }
    catch (error) {
        logBitrixError('crm.lead.add', error, logPayload);
    }
}
/**
 * Adds the user's subsequent messages as timeline comments on the existing lead.
 * This keeps the full conversation visible inside a single lead card.
 */
async function addTimelineComment(leadId, sender, text, logPayload) {
    const params = new URLSearchParams();
    params.append('fields[ENTITY_ID]', String(leadId));
    params.append('fields[ENTITY_TYPE]', 'lead');
    params.append('fields[COMMENT]', `📩 @${sender.username ?? 'no_username'}: ${text}`);
    const url = `${config_1.config.bitrixWebhook}/crm.timeline.comment.add.json`;
    try {
        const response = await axios_1.default.post(url, params.toString(), {
            timeout: 10000,
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
    }
    catch (error) {
        logBitrixError('crm.timeline.comment.add', error, logPayload);
    }
}
/**
 * Logs a Bitrix forwarding failure without leaking the webhook secret.
 */
function logBitrixError(method, error, payload) {
    if (error instanceof axios_1.AxiosError) {
        console.error('[bitrix] Failed to forward message', JSON.stringify({
            method,
            telegramId: payload.telegramId,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        }));
        return;
    }
    console.error('[bitrix] Unexpected error:', error);
}
