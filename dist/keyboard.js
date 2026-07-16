"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACK_BUTTON_TEXT = exports.LOCATION_BUTTON_TEXT = exports.OPERATOR_BUTTON_TEXT = void 0;
exports.mainKeyboard = mainKeyboard;
exports.backKeyboard = backKeyboard;
const telegraf_1 = require("telegraf");
/** Label of the button that lets the user request a human operator. */
exports.OPERATOR_BUTTON_TEXT = "👨‍💼 Operator bilan bog'lanish";
/** Label of the button that shows the store location. */
exports.LOCATION_BUTTON_TEXT = '📍 Manzil';
/** Label of the button that returns the user to the main menu. */
exports.BACK_BUTTON_TEXT = '⬅️ Orqaga';
/**
 * The persistent main reply keyboard shown after /start, /menu, after
 * "Manzil" replies and after going "Orqaga" from the operator screen.
 * Row 1: Operator button. Row 2: Manzil (location) button.
 */
function mainKeyboard() {
    return telegraf_1.Markup.keyboard([[exports.OPERATOR_BUTTON_TEXT], [exports.LOCATION_BUTTON_TEXT]])
        .resize()
        .persistent();
}
/**
 * The keyboard shown after the user presses the operator button:
 * a single "Orqaga" button to return to the main menu.
 */
function backKeyboard() {
    return telegraf_1.Markup.keyboard([[exports.BACK_BUTTON_TEXT]])
        .resize()
        .persistent();
}
