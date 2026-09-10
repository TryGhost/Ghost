import assert from 'node:assert/strict';
import nock from 'nock';
import { MailgunLogsClient } from '../../../../../core/server/services/email-analytics/mailgun-logs-client';

const begin = new Date('2026-09-10T12:00:00.250Z');
const end = new Date('2026-09-10T14:00:00.750Z');
const timestamp = new Date('2026-09-10T13:00:00.500Z');
const filter = (attribute: string, value: string) => ({
  attribute,
  comparator: '=',
  values: [{ label: value, value }],
});

function event(overrides = {}) {
  return {
    id: 'event-1',
    event: 'opened',
    '@timestamp': timestamp.toISOString(),
    recipient: 'member@example.com',
    domain: { name: 'mail.example.com' },
    tags: ['bulk-email', 'site-tag'],
    message: { headers: { 'message-id': 'message-1@mail.example.com' } },
    'user-variables': JSON.stringify({ 'email-id': 'email-1' }),
    ...overrides,
  };
}

const pageOptions = {
  domain: 'mail.example.com',
  tags: ['bulk-email', 'site-tag'],
  events: ['opened'],
  begin,
  end,
};

const client = () =>
  new MailgunLogsClient({ apiKey: 'test-api-key', baseUrl: 'https://api.eu.mailgun.net/v3' });

describe('Mailgun Logs API client', () => {
  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it.each([
    { domain: '' },
    { tags: [] },
    { tags: [''] },
    { events: [] },
    { begin: new Date(NaN) },
    { end: new Date('2026-09-10T11:00:00Z') },
  ])('rejects invalid filters or time windows before making a request: %j', async (options) => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, { items: [], pagination: {} });
    await assert.rejects(
      client().getPage({ ...pageOptions, ...options }),
      /Invalid Mailgun Logs request/,
    );
    assert.equal(scope.isDone(), false);
  });

  it('preserves the HTTP status for rate handling without leaking transport credentials or response bodies', async () => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(429, { message: 'private-provider-response' });
    await assert.rejects(client().getPage(pageOptions), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error & { status?: number }).status, 429);
      const serialized = JSON.stringify(error);
      for (const secret of [
        'test-api-key',
        'private-provider-response',
        'password',
        'authorization',
      ]) {
        assert.equal(serialized.includes(secret), false);
      }
      assert.equal('cause' in error, false);
      return true;
    });
    scope.done();
  });

  it.each([
    { items: [] },
    { items: [event()], pagination: { next: 42 } },
    { items: [event({ domain: null })], pagination: {} },
    { items: [event({ tags: null })], pagination: {} },
    { items: [event({ '@timestamp': 'invalid' })], pagination: {} },
    { items: [null], pagination: {} },
  ])('rejects malformed pages rather than treating them as exhausted: %j', async (body) => {
    const scope = nock('https://api.eu.mailgun.net').post('/v1/analytics/logs').reply(200, body);
    await assert.rejects(client().getPage(pageOptions), /Invalid Mailgun Logs/);
    scope.done();
  });

  it('keeps domain, all-tag, event-type and exact timestamp boundaries on the response', async () => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, {
        items: [
          event({ id: 'before', '@timestamp': '2026-09-10T12:00:00.100Z' }),
          event({ id: 'other-domain', domain: { name: 'other.example.com' } }),
          event({ id: 'missing-site-tag', tags: ['bulk-email'] }),
          event({ id: 'wrong-type', event: 'delivered' }),
          event(),
          event({ id: 'after', '@timestamp': '2026-09-10T14:00:00.900Z' }),
        ],
        pagination: { next: 'next-page' },
      });
    const page = await client().getPage(pageOptions);
    assert.deepEqual(
      page.items.map((item) => item.id),
      ['event-1'],
    );
    assert.equal(page.next, 'next-page');
    assert.equal(page.empty, false);
    scope.done();
  });

  it('keeps opaque pagination tokens in the body and continues past filtered-only pages', async () => {
    const token = 'https://untrusted.example/opaque-token';
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs', (body) => {
        assert.equal(body.pagination.token, token);
        assert.deepEqual(body.filter.AND, [
          filter('domain', 'mail.example.com'),
          filter('tag', 'bulk-email'),
          filter('tag', 'site-tag'),
        ]);
        assert.deepEqual(body.events, ['opened']);
        return true;
      })
      .reply(200, {
        items: [event({ domain: { name: 'other.example.com' } })],
        pagination: { next: 'another-token' },
      });
    assert.deepEqual(await client().getPage({ ...pageOptions, token }), {
      items: [],
      next: 'another-token',
      empty: false,
    });
    scope.done();
  });

  it('normalizes nullable headers, both user-variable encodings, provider fallback and delivery errors', async () => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, {
        items: [
          event({
            id: 'nullable',
            message: { headers: null },
            'user-variables': { 'email-id': 'email-object' },
          }),
          event({ id: 'fallback', 'user-variables': 'invalid-json' }),
          event({ id: 'unmappable', message: { headers: null }, 'user-variables': null }),
          event({
            id: 'failed',
            event: 'failed',
            severity: 'permanent',
            'delivery-status': { code: 550, description: 'x'.repeat(2001), 'enhanced-code': 512 },
          }),
        ],
        pagination: { next: null },
      });
    const page = await client().getPage({ ...pageOptions, events: ['opened', 'failed'] });
    assert.deepEqual(
      page.items.map((item) => [item.id, item.emailId, item.providerId]),
      [
        ['nullable', 'email-object', undefined],
        ['fallback', undefined, 'message-1@mail.example.com'],
        ['failed', 'email-1', 'message-1@mail.example.com'],
      ],
    );
    assert.deepEqual(page.items[2].error, {
      code: 550,
      message: 'x'.repeat(2000),
      enhancedCode: '512',
    });
    assert.equal(page.items[2].severity, 'permanent');
    assert.equal(page.next, undefined);
    scope.done();
  });

  it('requests an isolated Logs page in the configured region and normalizes its event', async () => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs', {
        start: 'Thu, 10 Sep 2026 12:00:00 -0000',
        end: 'Thu, 10 Sep 2026 14:00:01 -0000',
        events: ['opened'],
        include_subaccounts: false,
        include_totals: false,
        filter: {
          AND: [
            filter('domain', 'mail.example.com'),
            filter('tag', 'bulk-email'),
            filter('tag', 'site-tag'),
          ],
        },
        pagination: { sort: 'timestamp:asc', limit: 100 },
      })
      .basicAuth({ user: 'api', pass: 'test-api-key' })
      .reply(200, { items: [event()], pagination: { next: 'opaque-next-token' } });
    const page = await client().getPage(pageOptions);
    assert.deepEqual(page, {
      items: [
        {
          id: 'event-1',
          type: 'opened',
          recipientEmail: 'member@example.com',
          emailId: 'email-1',
          providerId: 'message-1@mail.example.com',
          timestamp,
          severity: undefined,
          error: null,
        },
      ],
      next: 'opaque-next-token',
      empty: false,
    });
    scope.done();
  });
});
