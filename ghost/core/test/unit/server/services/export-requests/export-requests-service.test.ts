import assert from 'assert/strict';
import crypto from 'crypto';
import { ExportRequestsService } from '../../../../../core/server/services/export-requests/export-requests-service';

describe('ExportRequestsService', function () {
  const webhookUrl = 'https://archive-generator.example.com/api/generate/';
  const webhookSecret = 'not-a-live-secret';

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
      logging: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      request,
      ...overrides,
    };

    return new ExportRequestsService(dependencies as any);
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
      service.requestArchive({
        components: allComponents,
      }),
      (error: any) => {
        assert.equal(error.errorType, 'NotFoundError');
        return true;
      },
    );
  });

  it('throws an IncorrectUsageError when the secret is missing while the URL is configured', async function () {
    let errorMessage: string | undefined;
    const service = createService(
      {
        logging: {
          info: () => {},
          warn: () => {},
          error: (message: string) => {
            errorMessage = message;
          },
        },
      },
      {
        'hostSettings:export:webhookUrl': webhookUrl,
        'hostSettings:siteId': '12345',
      },
    );

    await assert.rejects(
      service.requestArchive({
        components: allComponents,
      }),
      (error: any) => {
        assert.equal(error.errorType, 'IncorrectUsageError');
        return true;
      },
    );

    assert.equal(
      errorMessage,
      'Export archive request is misconfigured: hostSettings:export:webhookSecret is missing while hostSettings:export:webhookUrl is set.',
    );
  });

  it('throws an IncorrectUsageError when the site id is missing while the URL is configured', async function () {
    let errorMessage: string | undefined;
    const service = createService(
      {
        logging: {
          info: () => {},
          warn: () => {},
          error: (message: string) => {
            errorMessage = message;
          },
        },
      },
      {
        'hostSettings:export:webhookUrl': webhookUrl,
        'hostSettings:export:webhookSecret': webhookSecret,
      },
    );

    await assert.rejects(
      service.requestArchive({
        components: allComponents,
      }),
      (error: any) => {
        assert.equal(error.errorType, 'IncorrectUsageError');
        return true;
      },
    );

    assert.equal(
      errorMessage,
      'Export archive request is misconfigured: hostSettings:siteId is missing while hostSettings:export:webhookUrl is set.',
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

    await service.requestArchive({
      components: allComponents,
    });

    assert.equal(JSON.parse(requestOptions.body).siteId, '12345');
  });

  it('sends a POST request with the signed payload', async function () {
    let requestUrl: string | undefined;
    let requestOptions: any;
    let infoMessage: string | undefined;
    const service = createService({
      logging: {
        info: (message: string) => {
          infoMessage = message;
        },
        warn: () => {},
        error: () => {},
      },
      request: async (url: string, options: unknown) => {
        requestUrl = url;
        requestOptions = options;
        return null;
      },
    });

    await service.requestArchive({
      components: allComponents,
    });

    assert.equal(requestUrl, webhookUrl);
    assert.equal(requestOptions.method, 'POST');
    assert.equal(
      infoMessage,
      'Requesting export archive generation from "https://archive-generator.example.com"',
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

    // The request must never retry: each delivery can schedule an archive.
    assert.deepEqual(requestOptions.retry, { limit: 0 });
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

      await service.requestArchive({
        components: allComponents,
      });

      assert.equal(capturedTimestamp, '1700000000000');
      assert.equal(
        capturedBody,
        '{"type":"export","siteId":"12345","components":{"content":true,"members":true,"analytics":true,"themes":true,"routes":true,"media":false}}',
      );
      assert.equal(capturedSignature, 'wVSf9NNJV/v5vnjx1zclb7HhiE7O4T7iE/EWT1BWr3g=');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('logs a sanitized URL and throws a generic 502 when the request fails', async function () {
    let errorMessage: string | undefined;
    const service = createService({
      logging: {
        info: () => {},
        warn: () => {},
        error: (message: string) => {
          errorMessage = message;
        },
      },
      request: async () => {
        throw new Error('Response code 500 (Internal Server Error)');
      },
    });

    await assert.rejects(
      service.requestArchive({
        components: allComponents,
      }),
      (error: any) => {
        assert.equal(error.statusCode, 502);
        assert.equal(error.message, 'Failed to start the export. Please try again later.');
        return true;
      },
    );

    assert.equal(
      errorMessage,
      'Failed to request export archive generation from "https://archive-generator.example.com": Response code 500 (Internal Server Error)',
    );
  });
});
