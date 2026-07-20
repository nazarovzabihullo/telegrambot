"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBitrixInstall = handleBitrixInstall;
const config_1 = require("../config");
const bitrixAuth_1 = require("../services/bitrixAuth");
const bitrixConnector_1 = require("../services/bitrixConnector");
// Standard Bitrix24 JS SDK snippet: closes the install slider/iframe cleanly.
// Harmless if the request wasn't actually opened inside a Bitrix iframe.
const BX24_FINISH_SCRIPT = `
<script src="//api.bitrix24.com/api/v1/"></script>
<script>
  if (window.BX24) {
    BX24.init(function () { BX24.installFinish(); });
  }
</script>
`;
function htmlPage(message) {
    return `<html><body>${message}${BX24_FINISH_SCRIPT}</body></html>`;
}
/**
 * Handles the Bitrix24 local-application install POST: captures the OAuth
 * tokens Bitrix hands us, then registers + activates our Open Lines connector
 * and binds the event handler — all in one idempotent step, so re-running the
 * "Install" button in Bitrix is always safe.
 *
 * This portal uses Bitrix's newer install flow: it sends SERVER_ENDPOINT
 * (a REST gateway URL, e.g. https://oauth.bitrix24.tech/rest/) instead of a
 * classic DOMAIN field.
 */
async function handleBitrixInstall(req, res) {
    const { SERVER_ENDPOINT: serverEndpoint, AUTH_ID: authId, AUTH_EXPIRES: authExpires, REFRESH_ID: refreshId, member_id: memberId, } = req.body;
    if (!serverEndpoint || !authId || !authExpires || !refreshId || !memberId) {
        console.error('[bitrix] Install handler received an incomplete payload. Content-Type:', req.headers['content-type'], 'Body:', JSON.stringify(req.body));
        res.status(400).send('Missing required install parameters.');
        return;
    }
    (0, bitrixAuth_1.saveInstall)({
        serverEndpoint,
        memberId,
        accessToken: authId,
        refreshToken: refreshId,
        expiresInSeconds: Number.parseInt(authExpires, 10),
    });
    try {
        await (0, bitrixConnector_1.registerConnector)();
        console.log('[bitrix] Connector registered');
        // Best-effort diagnostic only — never let it block activation below.
        try {
            const lines = await (0, bitrixConnector_1.listOpenLines)();
            console.log('[bitrix] Open Lines in this portal:', JSON.stringify(lines.map((l) => ({ ID: l.ID, NAME: l.LINE_NAME }))));
        }
        catch (listError) {
            console.warn('[bitrix] Could not list Open Lines (non-fatal):', listError instanceof Error ? listError.message : listError);
        }
        await (0, bitrixConnector_1.activateConnector)(config_1.config.bitrixLineId);
        console.log(`[bitrix] Connector activated on line ${config_1.config.bitrixLineId}`);
        const eventsUrl = `${config_1.config.webhookUrl}${config_1.config.bitrixEventsPath}`;
        await (0, bitrixConnector_1.bindEvent)('ONIMCONNECTORMESSAGEADD', eventsUrl);
        await (0, bitrixConnector_1.bindEvent)('ONAPPUNINSTALL', eventsUrl);
        console.log(`[bitrix] Events bound to ${eventsUrl}`);
    }
    catch (error) {
        console.error('[bitrix] Install setup failed:', error instanceof Error ? error.message : error);
        res.status(200).send(htmlPage('App installed, but connector setup failed — check server logs.'));
        return;
    }
    res.status(200).send(htmlPage('Telegram connector installed and activated.'));
}
