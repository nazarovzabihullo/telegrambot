"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
const config_1 = require("./config");
const keyboard_1 = require("./keyboard");
const start_1 = require("./handlers/start");
const location_1 = require("./handlers/location");
const operator_1 = require("./handlers/operator");
const back_1 = require("./handlers/back");
const bitrix_1 = require("./services/bitrix");
exports.bot = new telegraf_1.Telegraf(config_1.config.botToken);
// ---- Menu commands -------------------------------------------------------
exports.bot.start(start_1.handleStart);
exports.bot.command('menu', start_1.handleStart);
// ---- Menu buttons ----------------------------------------------------------
// These must be registered before the catch-all text handler below,
// so their exact-match presses never get forwarded to Bitrix24.
exports.bot.hears(keyboard_1.OPERATOR_BUTTON_TEXT, operator_1.handleOperator);
exports.bot.hears(keyboard_1.LOCATION_BUTTON_TEXT, location_1.handleLocation);
exports.bot.hears(keyboard_1.BACK_BUTTON_TEXT, back_1.handleBack);
// ---- Fallback: forward every other plain text message to Bitrix24 --------
// Runs only if none of the handlers above matched, so /start, /menu and
// all menu button presses (Operator, Manzil, Orqaga) never reach Bitrix
// as ordinary chat messages.
exports.bot.on((0, filters_1.message)('text'), async (ctx) => {
    const from = ctx.from;
    if (!from) {
        return;
    }
    const sender = {
        telegramId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
    };
    await (0, bitrix_1.forwardMessageToBitrix)(sender, ctx.message.text, ctx.message.message_id);
});
// ---- Global error handler ---------------------------------------------
// Prevents an unexpected error in any handler from crashing the process.
exports.bot.catch((error, ctx) => {
    console.error(`[bot] Unhandled error for update ${ctx.update.update_id}:`, error);
});
