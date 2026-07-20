"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOperator = handleOperator;
const telegram_1 = require("../services/telegram");
const bitrix_1 = require("../services/bitrix");
/**
 * Handles the "👨‍💼 Operator bilan bog'lanish" button press.
 * Immediately forwards a system notice to Bitrix24 so the chat/appeal opens
 * right away — some users press this button and then never type anything,
 * so waiting for their next message would leave the operator unaware they
 * wanted to talk at all.
 */
async function handleOperator(ctx) {
    const sender = (0, bitrix_1.senderFromCtx)(ctx);
    if (sender) {
        const messageId = ctx.message?.message_id ?? Math.floor(Date.now() / 1000);
        await (0, bitrix_1.forwardMessageToBitrix)(sender, "🔔 Foydalanuvchi operator bilan bog'lanishni so'radi.", messageId);
    }
    await (0, telegram_1.sendBackKeyboard)(ctx, "🔄 Operator bilan bog'lanmoqda...\n\nIltimos, xabaringizni yozing, operator tez orada javob beradi.");
}
