"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStoreLocation = sendStoreLocation;
exports.sendStoreInfo = sendStoreInfo;
exports.sendMainKeyboard = sendMainKeyboard;
exports.sendBackKeyboard = sendBackKeyboard;
const config_1 = require("../config");
const keyboard_1 = require("../keyboard");
/**
 * Sends the store's Telegram location (map pin) to the user.
 */
async function sendStoreLocation(ctx) {
    await ctx.sendLocation(config_1.config.store.latitude, config_1.config.store.longitude);
}
/**
 * Sends the formatted store info message (name, phone).
 */
async function sendStoreInfo(ctx) {
    const { name, phone } = config_1.config.store;
    const message = [`📍 ${name}`, `📞 ${phone}`].join('\n');
    await ctx.reply(message);
}
/**
 * Re-shows the persistent main reply keyboard (Operator + Manzil buttons).
 */
async function sendMainKeyboard(ctx, text) {
    await ctx.reply(text, (0, keyboard_1.mainKeyboard)());
}
/**
 * Shows the "Orqaga" (back) keyboard, used after the operator screen.
 */
async function sendBackKeyboard(ctx, text) {
    await ctx.reply(text, (0, keyboard_1.backKeyboard)());
}
