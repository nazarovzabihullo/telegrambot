import { Markup } from 'telegraf';
import type { ReplyKeyboardMarkup } from 'telegraf/typings/core/types/typegram';

/** Label of the button that lets the user request a human operator. */
export const OPERATOR_BUTTON_TEXT = "👨‍💼 Operator bilan bog'lanish";

/** Label of the button that shows the store location. */
export const LOCATION_BUTTON_TEXT = '📍 Manzil';

/** Label of the button that returns the user to the main menu. */
export const BACK_BUTTON_TEXT = '⬅️ Orqaga';

/**
 * The persistent main reply keyboard shown after /start, /menu, after
 * "Manzil" replies and after going "Orqaga" from the operator screen.
 * Row 1: Operator button. Row 2: Manzil (location) button.
 */
export function mainKeyboard(): Markup.Markup<ReplyKeyboardMarkup> {
  return Markup.keyboard([[OPERATOR_BUTTON_TEXT], [LOCATION_BUTTON_TEXT]])
    .resize()
    .persistent();
}

/**
 * The keyboard shown after the user presses the operator button:
 * a single "Orqaga" button to return to the main menu.
 */
export function backKeyboard(): Markup.Markup<ReplyKeyboardMarkup> {
  return Markup.keyboard([[BACK_BUTTON_TEXT]])
    .resize()
    .persistent();
}
