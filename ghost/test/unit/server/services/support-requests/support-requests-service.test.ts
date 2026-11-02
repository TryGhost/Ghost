import assert from 'assert/strict';
import crypto from 'crypto';
import type { buildSignedWebhookRequest } from '../../../../../core/server/lib/signed-webhook';
import {
  SupportRequestsService,
  type SupportRequest,
} from '../../../../../core/server/services/support-requests/support-requests-service';
import { createLoggingFake } from '../../../../utils/logging-utils';

type RequestOptions = ReturnType<typeof buildSignedWebhookRequest>;

interface CapturedRequest {
  url: string;
  options: RequestOptions;
}

describe('SupportRequestsService', function () {
  const webhookUrl = 'https://support.example.com/api/requests/';
  const webhookSecret = 'not-a-live-secret';

  const supportRequest: SupportRequest = {
    requestedBy: {
      id: '1',
      name: 'Jamie Larson',
      email: 'jamie@example.com',
    },
    subject: 'Cannot connect my domain',
    message: 'The DNS check keeps failing.',
    source: 'help-chat',
    pageUrl: 'https://example.com/ghost/#/settings',
    context: {
      chat_url: 'https://chat.example.com/conversations/1',
      chat_transcript: '**User**\nHow do I connect my domain?',
    },
  };

  const defaultConfig = {
    'hostSettings:supportRequest:webhookUrl': webhookUrl,
    'hostSettings:supportRequest:webhookSecret': webhookSecret,
    'hostSettings:siteId': '12345',
  };

  function createService({
    configValues = defaultConfig,
    request = async () => null,
  }: {
    configValues?: Record<string, unknown>;
    request?: (url: string, options: RequestOptions) => Promise<unknown>;
  } = {}) {
    const logging = createLoggingFake();
    const service = new SupportRequestsService({
      config: { get: (key: string) => configValues[key] },
      logging,
      request,
    });

    return { service, logging };
  }

  function captureRequests() {
    const captured: CapturedRequest[] = [];

    const request = async (url: string, options: RequestOptions) => {
      captured.push({ url, options });

      return null;
    };

    return { captured, request };
  }

  it('throws a NotFoundError when the webhook URL is not configured', async function () {
    const { service } = createService({
      configValues: {
        'hostSettings:supportRequest:webhookSecret': webhookSecret,
        'hostSettings:siteId': '12345',
      },
    });

    await assert.rejects(service.send(supportRequest), { errorType: 'NotFoundError' });
  });

  it('throws an IncorrectUsageError when the secret is missing while the URL is configured', async function () {
    const { service, logging } = createService({
      configValues: {
        'hostSettings:supportRequest:webhookUrl': webhookUrl,
        'hostSettings:siteId': '12345',
      },
    });

    await assert.rejects(service.send(supportRequest), { errorType: 'IncorrectUsageError' });

    assert.deepEqual(logging.error.args, [
      [
        'Support request is misconfigured: hostSettings:supportRequest:webhookSecret is missing while hostSettings:supportRequest:webhookUrl is set.',
      ],
    ]);
  });

  it('throws an IncorrectUsageError when the site id is missing while the URL is configured', async function () {
    const { service, logging } = createService({
      configValues: {
        'hostSettings:supportRequest:webhookUrl': webhookUrl,
        'hostSettings:supportRequest:webhookSecret': webhookSecret,
      },
    });

    await assert.rejects(service.send(supportRequest), { errorType: 'IncorrectUsageError' });

    assert.deepEqual(logging.error.args, [
      [
        'Support request is misconfigured: hostSettings:siteId is missing while hostSettings:supportRequest:webhookUrl is set.',
      ],
    ]);
  });

  it('accepts a numeric site id from env-var config parsing', async function () {
    const { captured, request } = captureRequests();
    const { service } = createService({
      configValues: { ...defaultConfig, 'hostSettings:siteId': 12345 },
      request,
    });

    await service.send(supportRequest);

    assert.equal(JSON.parse(captured[0].options.body).siteId, '12345');
  });

  it('sends the request as a signed support_request event without retries', async function () {
    const { captured, request } = captureRequests();
    const { service, logging } = createService({ request });

    await service.send(supportRequest);

    assert.equal(captured.length, 1);

    const [{ url, options }] = captured;

    assert.equal(url, webhookUrl);
    assert.equal(options.method, 'POST');
    assert.deepEqual(logging.info.args, [
      ['Sending support request to "https://support.example.com"'],
    ]);
    assert.deepEqual(JSON.parse(options.body), {
      type: 'support_request',
      siteId: '12345',
      ...supportRequest,
    });

    const timestamp = options.headers['X-Ghost-Request-Timestamp'];

    assert.equal(
      options.headers['X-Ghost-Signature'],
      crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestamp}:${options.body}`)
        .digest('base64'),
    );

    // A repeated delivery would duplicate the support request, so it must never retry.
    assert.deepEqual(options.retry, { limit: 0 });
  });

  it('logs a sanitized URL and throws a generic 502 when the request fails', async function () {
    const { service, logging } = createService({
      request: async () => {
        throw Object.assign(
          new Error(
            'Request failed with status code 500 (Internal Server Error): POST https://support.example.com/secret-path?token=abc',
          ),
          { code: 'ERR_NON_2XX_3XX_RESPONSE', response: { statusCode: 500 } },
        );
      },
    });

    await assert.rejects(service.send(supportRequest), {
      statusCode: 502,
      message: 'Failed to send the support request. Please try again later.',
    });

    assert.deepEqual(logging.error.args, [
      ['Failed to send support request to "https://support.example.com": HTTP 500'],
    ]);
  });
});
