"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLocation = handleLocation;
const telegram_1 = require("../services/telegram");
/**
 * Handles the "📍 Manzil" button press:
 * 1. Sends the Telegram location (map pin).
 * 2. Sends the formatted store info text.
 * 3. Re-shows the persistent keyboard.
 */
async function handleLocation(ctx) {
    await (0, telegram_1.sendStoreLocation)(ctx);
    await (0, telegram_1.sendStoreInfo)(ctx);
    await (0, telegram_1.sendMainKeyboard)(ctx, 'Yana kerak bo\u2019lsa, tugmani bosing.');
}
