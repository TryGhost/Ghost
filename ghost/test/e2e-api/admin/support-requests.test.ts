import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import nock from 'nock';
import {
  agentProvider,
  configUtils,
  dbUtils,
  fixtureManager,
  resetRateLimits,
} from '../../utils/e2e-framework';

const HOST_ORIGIN = 'https://support.example.com';
const HOST_PATH = '/api/requests/';
const WEBHOOK_SECRET = 'test-support-request-webhook-secret';
const SITE_ID = 'test-site-id';

const SUPPORT_REQUEST = {
  subject: 'Cannot connect my domain',
  message: 'The DNS check keeps failing.',
};

function configureHost() {
  configUtils.set('hostSettings:supportRequest:webhookUrl', `${HOST_ORIGIN}${HOST_PATH}`);
  configUtils.set('hostSettings:supportRequest:webhookSecret', WEBHOOK_SECRET);
  configUtils.set('hostSettings:siteId', SITE_ID);
}

interface CapturedRequest {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mockHost({ status = 202 } = {}) {
  const captured: CapturedRequest = {};

  nock(HOST_ORIGIN)
    .post(HOST_PATH)
    .reply(function (uri, requestBody) {
      captured.headers = this.req.headers;
      if (isRecord(requestBody)) {
        captured.body = requestBody;
      }
      return [status, {}];
    });

  return captured;
}

describe('Support requests API', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();

    await fixtureManager.init('users');
  });

  beforeEach(async function () {
    await dbUtils.truncate('brute');

    resetRateLimits();
  });

  afterEach(async function () {
    nock.cleanAll();

    await configUtils.restore();
  });

  describe('As Unauthorized User', function () {
    it('Cannot send a support request', async function () {
      configureHost();

      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(403);
    });
  });

  describe('As Owner', function () {
    beforeAll(async function () {
      await agent.loginAsOwner();
    });

    it('Sends a signed support request with the signed-in user as the requester', async function () {
      configureHost();

      const captured = mockHost();

      await agent
        .post('/support_requests/')
        .body({
          support_requests: [
            {
              ...SUPPORT_REQUEST,
              source: 'help-chat',
              page_url: 'https://example.com/ghost/#/settings',
              context: {
                conversation_url: 'https://chat.example.com/conversations/1',
                transcript: '**User**\nHow do I connect my domain?',
              },
            },
          ],
        })
        .expectStatus(202);

      const owner = fixtureManager.get('users', 0);

      assert.deepEqual(captured.body, {
        type: 'support_request',
        siteId: SITE_ID,
        requestedBy: { id: owner.id, name: owner.name, email: owner.email },
        ...SUPPORT_REQUEST,
        source: 'help-chat',
        pageUrl: 'https://example.com/ghost/#/settings',
        context: {
          conversation_url: 'https://chat.example.com/conversations/1',
          transcript: '**User**\nHow do I connect my domain?',
        },
      });

      assert.ok(captured.headers, 'Expected the outbound request headers to be captured');

      const timestamp = captured.headers['x-ghost-request-timestamp'];

      // nock hands us the parsed body; the service signs the raw
      // JSON.stringify output, which re-stringifying reproduces exactly
      const rawBody = JSON.stringify(captured.body);

      assert.equal(
        captured.headers['x-ghost-signature'],
        crypto
          .createHmac('sha256', WEBHOOK_SECRET)
          .update(`${timestamp}:${rawBody}`)
          .digest('base64'),
      );
    });

    it('Sends null and an empty context for optional fields that were not provided', async function () {
      configureHost();

      const captured = mockHost();

      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(202);

      assert.ok(captured.body, 'Expected an outbound request to the host');
      assert.equal(captured.body.source, null);
      assert.equal(captured.body.pageUrl, null);
      assert.deepEqual(captured.body.context, {});
    });

    for (const field of [
      { name: 'Someone Else' },
      { email: 'attacker@example.com' },
      { requested_by: { email: 'attacker@example.com' } },
    ]) {
      it(`Rejects requester details supplied as ${Object.keys(field)[0]}`, async function () {
        configureHost();

        const captured = mockHost();

        await agent
          .post('/support_requests/')
          .body({ support_requests: [{ ...SUPPORT_REQUEST, ...field }] })
          .expectStatus(422);

        assert.equal(captured.body, undefined, 'Expected no outbound request');
      });
    }

    it('Returns 404 when no host is configured', async function () {
      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(404);
    });

    it('Refuses to send when the secret is missing while the host is configured', async function () {
      configUtils.set('hostSettings:supportRequest:webhookUrl', `${HOST_ORIGIN}${HOST_PATH}`);
      configUtils.set('hostSettings:siteId', SITE_ID);

      const captured = mockHost();

      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(400);

      assert.equal(captured.body, undefined, 'Expected no unsigned outbound request');
    });

    it('Returns 502 when the host rejects the request', async function () {
      configureHost();

      mockHost({ status: 500 });

      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(502);
    });

    it('Never exposes the webhook secret through the config endpoint', async function () {
      configureHost();

      await agent
        .get('/config/')
        .expectStatus(200)
        .expect(
          ({
            body,
          }: {
            body: { config: { hostSettings: { supportRequest: Record<string, unknown> } } };
          }) => {
            const supportRequest = body.config.hostSettings.supportRequest;
            assert.equal(supportRequest.webhookUrl, `${HOST_ORIGIN}${HOST_PATH}`);
            assert.equal('webhookSecret' in supportRequest, false);
          },
        );
    });

    for (const [description, override] of [
      ['the body has no support_requests array', null],
      ['the subject is blank', { subject: '   ' }],
      ['the message is missing', { message: undefined }],
      ['a URL is not http(s)', { page_url: 'javascript:alert(1)' }],
      ['the source is not a slug', { source: 'Help Chat!' }],
      ['an unknown field is sent', { attachments: [] }],
      ['the context is not an object', { context: 'transcript' }],
      ['a context key is not a slug', { context: { 'Conversation URL': 'x' } }],
      ['a context value is not a string', { context: { transcript: 42 } }],
      ['a context value is blank', { context: { transcript: '   ' } }],
    ] as const) {
      it(`Returns 422 when ${description}`, async function () {
        configureHost();

        const captured = mockHost();
        const body =
          override === null ? {} : { support_requests: [{ ...SUPPORT_REQUEST, ...override }] };

        await agent.post('/support_requests/').body(body).expectStatus(422);

        assert.equal(captured.body, undefined, 'Expected no outbound request');
      });
    }

    it('Limits how many support requests a site can send', async function () {
      configureHost();

      const { freeRetries } = configUtils.config.get('spam:support_request_block');

      // express-brute lets the first request through, then freeRetries more
      for (let i = 0; i < freeRetries + 1; i += 1) {
        mockHost();

        await agent
          .post('/support_requests/')
          .body({ support_requests: [SUPPORT_REQUEST] })
          .expectStatus(202);
      }

      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(429);
    });
  });

  describe('As Contributor', function () {
    beforeAll(async function () {
      await agent.loginAsContributor();
    });

    it('Can send a support request', async function () {
      configureHost();

      const captured = mockHost();

      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(202);

      assert.ok(captured.body, 'Expected an outbound request to the host');
      assert.ok(isRecord(captured.body.requestedBy), 'Expected the requester details');
      assert.notEqual(captured.body.requestedBy.id, fixtureManager.get('users', 0).id);
    });
  });

  describe('With an integration token', function () {
    beforeAll(async function () {
      await agent.useZapierAdminAPIKey();
    });

    // support_requests is deliberately absent from the integration token
    // allowlist in admin/middleware.js: this is a staff-session only action.
    it('Cannot send a support request', async function () {
      configureHost();

      await agent
        .post('/support_requests/')
        .body({ support_requests: [SUPPORT_REQUEST] })
        .expectStatus(403);
    });
  });
});
