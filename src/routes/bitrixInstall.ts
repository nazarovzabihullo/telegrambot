import type { Request, Response } from 'express';
import { config } from '../config';
import { saveInstall } from '../services/bitrixAuth';
import { registerConnector, activateConnector, bindEvent, listOpenLines } from '../services/bitrixConnector';

/**
 * Handles the Bitrix24 local-application install POST: captures the OAuth
 * tokens Bitrix hands us, then registers + activates our Open Lines connector
 * and binds the event handler — all in one idempotent step, so re-running the
 * "Install" button in Bitrix is always safe.
 */
export async function handleBitrixInstall(req: Request, res: Response): Promise<void> {
  const { DOMAIN, AUTH_ID, AUTH_EXPIRES, REFRESH_ID, member_id: memberId } = req.body as Record<
    string,
    string | undefined
  >;

  if (!DOMAIN || !AUTH_ID || !AUTH_EXPIRES || !REFRESH_ID || !memberId) {
    console.error('[bitrix] Install handler received an incomplete payload:', req.body);
    res.status(400).send('Missing required install parameters.');
    return;
  }

  saveInstall({
    domain: DOMAIN,
    memberId,
    accessToken: AUTH_ID,
    refreshToken: REFRESH_ID,
    expiresInSeconds: Number.parseInt(AUTH_EXPIRES, 10),
  });

  try {
    await registerConnector();
    console.log('[bitrix] Connector registered');

    const lines = await listOpenLines();
    console.log(
      '[bitrix] Open Lines in this portal:',
      JSON.stringify(lines.map((l) => ({ ID: l.ID, NAME: l.LINE_NAME })))
    );

    await activateConnector(config.bitrixLineId);
    console.log(`[bitrix] Connector activated on line ${config.bitrixLineId}`);

    const eventsUrl = `${config.webhookUrl}${config.bitrixEventsPath}`;
    await bindEvent('ONIMCONNECTORMESSAGEADD', eventsUrl);
    await bindEvent('ONAPPUNINSTALL', eventsUrl);
    console.log(`[bitrix] Events bound to ${eventsUrl}`);
  } catch (error) {
    console.error('[bitrix] Install setup failed:', error instanceof Error ? error.message : error);
    res.status(200).send('<html><body>App installed, but connector setup failed — check server logs.</body></html>');
    return;
  }

  res.status(200).send('<html><body>Telegram connector installed and activated.</body></html>');
}
