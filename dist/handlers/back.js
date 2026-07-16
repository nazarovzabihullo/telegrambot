"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBack = handleBack;
const telegram_1 = require("../services/telegram");
/**
 * Handles the "⬅️ Orqaga" button press: returns the user to the
 * main menu (Operator + Manzil buttons).
 */
async function handleBack(ctx) {
    await (0, telegram_1.sendMainKeyboard)(ctx, "Asosiy menyu \u{1F447}");
}
