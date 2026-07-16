"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const bot_1 = require("./bot");
const app = (0, express_1.default)();
// Health-check / root route.
app.get('/', (_req, res) => {
    res.status(200).send('Bot is running');
});
// Telegram webhook endpoint. Telegraf parses the raw request body itself,
// so this must be mounted before any global JSON body-parser middleware.
app.use(bot_1.bot.webhookCallback(config_1.config.webhookPath));
/**
 * Registers the Telegram webhook so that Telegram starts delivering
 * updates to our Express endpoint. Called once on startup.
 */
async function registerWebhook() {
    const fullWebhookUrl = `${config_1.config.webhookUrl}${config_1.config.webhookPath}`;
    await bot_1.bot.telegram.setWebhook(fullWebhookUrl);
    console.log(`[startup] Webhook registered at ${fullWebhookUrl}`);
}
async function main() {
    try {
        await registerWebhook();
        app.listen(config_1.config.port, () => {
            console.log(`[startup] Express server listening on port ${config_1.config.port}`);
        });
    }
    catch (error) {
        console.error('[startup] Failed to start the bot:', error);
        process.exit(1);
    }
}
// Graceful shutdown so Telegraf can clean up (e.g. stop long polling
// if it was ever used) and the process exits cleanly under process
// managers like PM2/systemd/Docker.
process.once('SIGINT', () => bot_1.bot.stop('SIGINT'));
process.once('SIGTERM', () => bot_1.bot.stop('SIGTERM'));
void main();
