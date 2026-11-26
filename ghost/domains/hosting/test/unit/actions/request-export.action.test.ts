import assert from 'assert/strict';
import crypto from 'crypto';
import nock from 'nock';
import sinon from 'sinon';
import ghostRequest from '@tryghost/request';
import { createLoggingFake } from '../../../../../test/utils/logging-utils';
import { RequestExport } from '../../../actions/request-export.action';

describe('Request export action', function () {
  const webhookUrl = 'https://export-generator.example.com/api/generate/';
  const webhookSecret = 'not-a-live-secret';
  const requestedByUserId = '1';

  const allComponents = {
    content: true,
    members: true,
    analytics: true,
    themes: true,
    routes: true,
    media: false,
  };

  const createService = (
    overrides: Record<string, unknown> = {},
    configValues: Record<string, unknown> | null = null,
  ) => {
    const request = async () => null;
    const values: Record<string, unknown> = configValues ?? {
      'hostSettings:export:webhookUrl': webhookUrl,
      'hostSettings:export:webhookSecret': webhookSecret,
      'hostSettings:siteId': '12345',
    };
    const dependencies = {
      config: {
        get: (key: string) => values[key],
      },
      logging: createLoggingFake(),
      request,
      ...overrides,
    };

    const action = new RequestExport(dependencies as any);
    return {
      requestExport: (input: Parameters<RequestExport['handle']>[0]) => action.handle(input),
    };
  };

  it('throws a NotFoundError when the webhook URL is not configured', async function () {
    const service = createService(
      {},
      {
        'hostSettings:export:webhookSecret': webhookSecret,
        'hostSettings:siteId': '12345',
      },
    );

    await assert.rejects(
      service.requestExport({
        components: allComponents,
        requestedByUserId,
      }),
      (error: any) => {
        assert.equal(error.errorType, 'NotFoundError');
        return true;
      },
    );
  });

  it('throws an IncorrectUsageError when the secret is missing while the URL is configured', async function () {
    const logging = createLoggingFake();
    const service = createService(
      {
        logging,
      },
      {
        'hostSettings:export:webhookUrl': webhookUrl,
        'hostSettings:siteId': '12345',
      },
    );

    await assert.rejects(
      service.requestExport({
        components: allComponents,
        requestedByUserId,
      }),
      (error: any) => {
        assert.equal(error.errorType, 'IncorrectUsageError');
        return true;
      },
    );

    sinon.assert.calledOnceWithExactly(
      logging.error,
      'Export request is misconfigured: hostSettings:export:webhookSecret is missing while hostSettings:export:webhookUrl is set.',
    );
  });

  it('throws an IncorrectUsageError when the site id is missing while the URL is configured', async function () {
    const logging = createLoggingFake();
    const service = createService(
      {
        logging,
      },
      {
        'hostSettings:export:webhookUrl': webhookUrl,
        'hostSettings:export:webhookSecret': webhookSecret,
      },
    );

    await assert.rejects(
      service.requestExport({
        components: allComponents,
        requestedByUserId,
      }),
      (error: any) => {
        assert.equal(error.errorType, 'IncorrectUsageError');
        return true;
      },
    );

    sinon.assert.calledOnceWithExactly(
      logging.error,
      'Export request is misconfigured: hostSettings:siteId is missing while hostSettings:export:webhookUrl is set.',
    );
  });

  it('accepts a numeric site id from env-var config parsing', async function () {
    let requestOptions: any;
    const service = createService(
      {
        request: async (url: string, options: unknown) => {
          requestOptions = options;
          return null;
        },
      },
      {
        'hostSettings:export:webhookUrl': webhookUrl,
        'hostSettings:export:webhookSecret': webhookSecret,
        'hostSettings:siteId': 12345,
      },
    );

    await service.requestExport({
      components: allComponents,
      requestedByUserId,
    });

    assert.equal(JSON.parse(requestOptions.body).siteId, '12345');
  });

  it('sends a POST request with the signed payload', async function () {
    let requestUrl: string | undefined;
    let requestOptions: any;
    const logging = createLoggingFake();
    const service = createService({
      logging,
      request: async (url: string, options: unknown) => {
        requestUrl = url;
        requestOptions = options;
        return null;
      },
    });

    await service.requestExport({
      components: allComponents,
      requestedByUserId,
    });

    assert.equal(requestUrl, webhookUrl);
    assert.equal(requestOptions.method, 'POST');
    sinon.assert.calledOnceWithExactly(
      logging.info,
      'Requesting export generation from "https://export-generator.example.com"',
    );

    const parsedBody = JSON.parse(requestOptions.body);
    assert.deepEqual(parsedBody, {
      type: 'export',
      siteId: '12345',
      components: {
        content: true,
        members: true,
        analytics: true,
        themes: true,
        routes: true,
        media: false,
      },
      requestedByUserId: '1',
    });

    assert.equal(requestOptions.headers['Content-Type'], 'application/json');
    assert.equal(requestOptions.headers['Content-Length'], Buffer.byteLength(requestOptions.body));
    assert.match(requestOptions.headers['Content-Version'], /^v\d+\.\d+$/);

    const timestamp = requestOptions.headers['X-Ghost-Request-Timestamp'];
    assert.match(timestamp, /^\d+$/);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}:${requestOptions.body}`)
      .digest('base64');

    assert.equal(requestOptions.headers['X-Ghost-Signature'], expectedSignature);
  });

  it('sends a request once, even when it fails outside the test environment', async function () {
    // Each delivery can schedule an export, so a failure must never be retried.
    const generator = nock('https://export-generator.example.com')
      .post('/api/generate/')
      .reply(503)
      .post('/api/generate/')
      .reply(202);
    const service = createService({ request: ghostRequest });
    const environment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await assert.rejects(service.requestExport({ components: allComponents, requestedByUserId }));
      // The 202 that a retry would have taken is still waiting.
      assert.equal(generator.pendingMocks().length, 1);
    } finally {
      process.env.NODE_ENV = environment;
      nock.cleanAll();
    }
  });

  it('does not resend the request when a redirect leads to a failure', async function () {
    // got may retry the GET that follows a 303, but never the POST itself.
    const generator = nock('https://export-generator.example.com')
      .post('/api/generate/')
      .reply(303, '', { location: '/api/generate/status/' })
      .get('/api/generate/status/')
      .times(3)
      .reply(503, '', { 'retry-after': '0' })
      .post('/api/generate/')
      .reply(202);
    const service = createService({ request: ghostRequest });
    const environment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await assert.rejects(service.requestExport({ components: allComponents, requestedByUserId }));
      // The 202 that a second POST would have taken is still waiting.
      const pendingPosts = generator.pendingMocks().filter((mock) => mock.startsWith('POST'));
      assert.equal(pendingPosts.length, 1);
    } finally {
      process.env.NODE_ENV = environment;
      nock.cleanAll();
    }
  });

  it('computes the documented HMAC for a known secret, timestamp and body', async function () {
    // Pins the exact wire contract the receiving host verifies:
    // base64(HMAC-SHA256(secret, `${timestamp}:${rawBody}`))
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    try {
      let capturedSignature: string | undefined;
      let capturedBody: string | undefined;
      let capturedTimestamp: string | undefined;
      const service = createService(
        {
          request: async (url: string, options: any) => {
            capturedSignature = options.headers['X-Ghost-Signature'];
            capturedBody = options.body;
            capturedTimestamp = options.headers['X-Ghost-Request-Timestamp'];
            return null;
          },
        },
        {
          'hostSettings:export:webhookUrl': webhookUrl,
          'hostSettings:export:webhookSecret': 'known-secret',
          'hostSettings:siteId': '12345',
        },
      );

      await service.requestExport({
        components: allComponents,
        requestedByUserId,
      });

      assert.equal(capturedTimestamp, '1700000000000');
      assert.equal(
        capturedBody,
        '{"type":"export","siteId":"12345","components":{"content":true,"members":true,"analytics":true,"themes":true,"routes":true,"media":false},"requestedByUserId":"1"}',
      );
      assert.equal(capturedSignature, 'f/YrIAor93kVDB6iv/BWBlegO4q5klaZRyRd5IKPKOU=');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('logs a sanitized URL and throws a generic 502 when the request fails', async function () {
    const logging = createLoggingFake();
    const service = createService({
      logging,
      request: async () => {
        throw Object.assign(
          new Error(
            'Request failed with status code 500 (Internal Server Error): POST https://export-generator.example.com/secret-path?token=abc',
          ),
          { code: 'ERR_NON_2XX_3XX_RESPONSE', response: { statusCode: 500 } },
        );
      },
    });

    await assert.rejects(
      service.requestExport({
        components: allComponents,
        requestedByUserId,
      }),
      (error: any) => {
        assert.equal(error.statusCode, 502);
        assert.equal(error.message, 'Failed to start the export. Please try again later.');
        return true;
      },
    );

    sinon.assert.calledOnceWithExactly(
      logging.error,
      'Failed to request export generation from "https://export-generator.example.com": HTTP 500',
    );
  });
});
