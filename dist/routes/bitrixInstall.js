"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBitrixInstall = handleBitrixInstall;
const config_1 = require("../config");
const bitrixAuth_1 = require("../services/bitrixAuth");
const bitrixConnector_1 = require("../services/bitrixConnector");
/**
 * Handles the Bitrix24 local-application install POST: captures the OAuth
 * tokens Bitrix hands us, then registers + activates our Open Lines connector
 * and binds the event handler — all in one idempotent step, so re-running the
 * "Install" button in Bitrix is always safe.
 */
async function handleBitrixInstall(req, res) {
    const { DOMAIN, AUTH_ID, AUTH_EXPIRES, REFRESH_ID, member_id: memberId } = req.body;
    if (!DOMAIN || !AUTH_ID || !AUTH_EXPIRES || !REFRESH_ID || !memberId) {
        console.error('[bitrix] Install handler received an incomplete payload:', req.body);
        res.status(400).send('Missing required install parameters.');
        return;
    }
    (0, bitrixAuth_1.saveInstall)({
        domain: DOMAIN,
        memberId,
        accessToken: AUTH_ID,
        refreshToken: REFRESH_ID,
        expiresInSeconds: Number.parseInt(AUTH_EXPIRES, 10),
    });
    try {
        await (0, bitrixConnector_1.registerConnector)();
        console.log('[bitrix] Connector registered');
        const lines = await (0, bitrixConnector_1.listOpenLines)();
        console.log('[bitrix] Open Lines in this portal:', JSON.stringify(lines.map((l) => ({ ID: l.ID, NAME: l.LINE_NAME }))));
        await (0, bitrixConnector_1.activateConnector)(config_1.config.bitrixLineId);
        console.log(`[bitrix] Connector activated on line ${config_1.config.bitrixLineId}`);
        const eventsUrl = `${config_1.config.webhookUrl}${config_1.config.bitrixEventsPath}`;
        await (0, bitrixConnector_1.bindEvent)('ONIMCONNECTORMESSAGEADD', eventsUrl);
        await (0, bitrixConnector_1.bindEvent)('ONAPPUNINSTALL', eventsUrl);
        console.log(`[bitrix] Events bound to ${eventsUrl}`);
    }
    catch (error) {
        console.error('[bitrix] Install setup failed:', error instanceof Error ? error.message : error);
        res.status(200).send('<html><body>App installed, but connector setup failed — check server logs.</body></html>');
        return;
    }
    res.status(200).send('<html><body>Telegram connector installed and activated.</body></html>');
}
