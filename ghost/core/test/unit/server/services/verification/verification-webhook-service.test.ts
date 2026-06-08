import assert from 'assert/strict';
import crypto from 'crypto';
import {VerificationWebhookService} from '../../../../../core/server/services/verification/verification-webhook-service';

describe('VerificationWebhookService', function () {
    const webhookUrl = 'https://test-webhook-receiver.com/mock-verification-event-endpoint/';
    const webhookSecret = 'not-a-live-secret';
    const webhookType = 'mock_verification_event';

    const createService = (overrides: Record<string, unknown> = {}) => {
        const request = async () => null;
        const dependencies = {
            config: {
                get: (key: string) => {
                    const values: Record<string, unknown> = {
                        'hostSettings:emailVerification:webhookType': webhookType,
                        'hostSettings:emailVerification:webhookUrl': webhookUrl,
                        'hostSettings:emailVerification:webhookSecret': webhookSecret,
                        'hostSettings:siteId': '1'
                    };

                    return values[key];
                }
            },
            logging: {
                info: () => {},
                warn: () => {},
                error: () => {}
            },
            request,
            ...overrides
        };

        return new VerificationWebhookService(dependencies as any);
    };

    it('returns false when webhookType is missing', async function () {
        let warnMessage: string | undefined;
        const service = createService({
            config: {
                get: (key: string) => {
                    if (key === 'hostSettings:emailVerification:webhookType') {
                        return '';
                    }

                    if (key === 'hostSettings:emailVerification:webhookUrl') {
                        return webhookUrl;
                    }

                    return null;
                }
            },
            logging: {
                info: () => {},
                warn: (message: string) => {
                    warnMessage = message;
                },
                error: () => {}
            }
        });

        const result = await service.sendVerificationWebhook({
            amountTriggered: 1001,
            threshold: 1000,
            method: 'import'
        });

        assert.equal(result, false);
        assert.equal(warnMessage, 'Verification webhook is not configured because webhookType is missing.');
    });

    it('sends a POST request with the signed webhook payload', async function () {
        let requestUrl: string | undefined;
        let requestOptions: any;
        let infoMessage: string | undefined;
        const service = createService({
            logging: {
                info: (message: string) => {
                    infoMessage = message;
                },
                warn: () => {},
                error: () => {}
            },
            request: async (url: string, options: unknown) => {
                requestUrl = url;
                requestOptions = options;
                return null;
            }
        });

        const result = await service.sendVerificationWebhook({
            amountTriggered: 1001,
            threshold: 1000,
            method: 'import'
        });

        assert.equal(result, true);
        assert.equal(requestUrl, webhookUrl);
        assert.equal(requestOptions.method, 'POST');
        assert.equal(infoMessage, 'Triggering verification webhook to "https://test-webhook-receiver.com"');

        const parsedBody = JSON.parse(requestOptions.body);
        assert.deepEqual(parsedBody, {
            type: webhookType,
            siteId: '1',
            threshold: 1000,
            amountTriggered: 1001,
            method: 'import'
        });

        const timestamp = requestOptions.headers['X-Ghost-Request-Timestamp'];
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(`${timestamp}:${requestOptions.body}`)
            .digest('base64');

        assert.equal(requestOptions.headers['X-Ghost-Signature'], expectedSignature);
    });

    it('logs a sanitized webhook URL when delivery fails', async function () {
        let errorMessage: string | undefined;
        const service = createService({
            logging: {
                info: () => {},
                warn: () => {},
                error: (message: string) => {
                    errorMessage = message;
                }
            },
            request: async () => {
                throw new Error('Webhook failed');
            }
        });

        await assert.rejects(service.sendVerificationWebhook({
            amountTriggered: 1001,
            threshold: 1000,
            method: 'import'
        }), /Webhook failed/);

        assert.equal(errorMessage, 'Failed to send verification webhook to "https://test-webhook-receiver.com": Webhook failed');
    });
});
