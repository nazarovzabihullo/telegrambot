"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStart = handleStart;
const telegram_1 = require("../services/telegram");
/**
 * Handles /start and /menu commands: greets the user and shows the
 * single-button persistent reply keyboard.
 */
async function handleStart(ctx) {
    await (0, telegram_1.sendMainKeyboard)(ctx, "Assalomu alaykum! Quyidagi tugmadan foydalaning \u{1F447}");
}
