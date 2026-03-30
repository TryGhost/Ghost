import nock from 'nock';

const configUtils = require('./config-utils');

type VerificationWebhookRequestRecord = {
    body: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
};

type SetupVerificationWebhookOptions = {
    apiThreshold?: number;
    adminThreshold?: number;
    importThreshold?: number;
    persist?: boolean;
    siteId?: string;
};

const DEFAULT_WEBHOOK_URL = 'https://test-webhook-receiver.com/mock-verification-event-endpoint/';
const DEFAULT_WEBHOOK_SECRET = 'not-a-live-secret';
const DEFAULT_WEBHOOK_TYPE = 'mock_verification_event';

export function setupMockVerificationWebhook({
    apiThreshold = 0,
    adminThreshold = 1,
    importThreshold = 0,
    persist = false,
    siteId = '1'
}: SetupVerificationWebhookOptions = {}) {
    const receivedWebhookRequests: VerificationWebhookRequestRecord[] = [];
    const webhookUrl = DEFAULT_WEBHOOK_URL;
    const webhookSecret = DEFAULT_WEBHOOK_SECRET;
    const webhookEndpoint = new URL(webhookUrl);

    configUtils.set('hostSettings:siteId', siteId);
    configUtils.set('hostSettings:emailVerification', {
        apiThreshold,
        adminThreshold,
        importThreshold,
        verified: false,
        escalationAddress: 'test@example.com',
        webhookType: DEFAULT_WEBHOOK_TYPE,
        webhookUrl,
        webhookSecret
    });

    const scope = nock(webhookEndpoint.origin);

    if (persist) {
        scope.persist();
    }

    scope.post(webhookEndpoint.pathname)
        .reply(function (_uri: string, requestBody: Buffer | string | Record<string, unknown>) {
            const rawBody = Buffer.isBuffer(requestBody) ?
                requestBody.toString('utf8') :
                typeof requestBody === 'string' ?
                    requestBody :
                    JSON.stringify(requestBody);
            const parsedBody = typeof requestBody === 'object' && !Buffer.isBuffer(requestBody) ?
                requestBody :
                JSON.parse(rawBody);

            receivedWebhookRequests.push({
                body: parsedBody as Record<string, unknown>,
                headers: this.req.headers,
                rawBody
            });

            return [200, {status: 'OK'}];
        });

    return {
        webhookSecret,
        webhookUrl,
        receivedWebhookRequests,
        scope
    };
}
