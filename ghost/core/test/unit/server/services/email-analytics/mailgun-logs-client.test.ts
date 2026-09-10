import assert from 'node:assert/strict';
import nock from 'nock';
import sinon from 'sinon';
import metrics from '@tryghost/metrics';
import logging from '@tryghost/logging';
import {
  MailgunLogsClient,
  resolveLogsUrl,
} from '../../../../../core/server/services/email-analytics/mailgun-logs-client';

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
  afterEach(() => {
    nock.cleanAll();
    sinon.restore();
  });

  it.each<{ headers: Record<string, string>; expected: { retryAt: number } | undefined }>([
    {
      headers: { 'retry-after': 'Thu, 10 Sep 2026 15:00:09 GMT' },
      expected: { retryAt: Date.parse('2026-09-10T15:00:09Z') },
    },
    {
      headers: {
        'retry-after': 'invalid',
        'x-ratelimit-remaining': '-1',
        'x-ratelimit-reset': '9007199254740993',
      },
      expected: undefined,
    },
  ])(
    'normalizes HTTP-date hints and ignores malformed metadata: %j',
    async ({ headers, expected }) => {
      const scope = nock('https://api.eu.mailgun.net')
        .post('/v1/analytics/logs')
        .reply(200, { items: [], pagination: {} }, headers);
      assert.deepEqual((await client().getPage(pageOptions)).rateLimit, expected);
      scope.done();
    },
  );

  it.each([200, 429])('retains only normalized rate hints from a %i response', async (status) => {
    const now = Date.parse('2026-09-10T15:00:00Z');
    sinon.useFakeTimers({ now, toFake: ['Date'] });
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(
        status,
        { items: [], pagination: {} },
        {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(now + 5000),
          'retry-after': '7',
          'x-private-provider': 'private-secret',
        },
      );
    const expected = { remaining: 0, resetAt: now + 5000, retryAt: now + 7000 };
    if (status === 200) {
      assert.deepEqual((await client().getPage(pageOptions)).rateLimit, expected);
    } else {
      await assert.rejects(client().getPage(pageOptions), (error: unknown) => {
        assert.deepEqual((error as { rateLimit?: unknown }).rateLimit, expected);
        assert.equal(JSON.stringify(error).includes('private-secret'), false);
        return true;
      });
    }
    scope.done();
  });

  it.each([200, 429])(
    'records request timing and safe HTTP status for a %i response',
    async (statusCode) => {
      const metric = sinon.stub(metrics, 'metric');
      const scope = nock('https://api.eu.mailgun.net')
        .post('/v1/analytics/logs')
        .reply(statusCode, { items: [], pagination: {} });
      if (statusCode === 200) {
        await client().getPage(pageOptions);
      } else {
        await assert.rejects(client().getPage(pageOptions));
      }
      sinon.assert.calledOnceWithExactly(metric, 'mailgun-get-events', {
        value: sinon.match.number,
        statusCode,
        source: 'logs',
      });
      scope.done();
    },
  );

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

  it.each([{ items: [] }, { items: [event()], pagination: { next: 42 } }, { pagination: {} }])(
    'rejects malformed pages rather than treating them as exhausted: %j',
    async (body) => {
      const scope = nock('https://api.eu.mailgun.net').post('/v1/analytics/logs').reply(200, body);
      await assert.rejects(client().getPage(pageOptions), /Invalid Mailgun Logs page/);
      scope.done();
    },
  );

  it('skips unreadable records with a warning instead of failing the page', async () => {
    const warn = sinon.stub(logging, 'warn');
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, {
        items: [
          event({ domain: null }),
          event({ '@timestamp': 'invalid' }),
          null,
          event({ tags: null }),
          event({ id: 'unattributable', recipient: null, 'user-variables': {} }),
          event({ id: 'readable', '@timestamp': end.toISOString() }),
        ],
        pagination: { next: 'more' },
      });
    const page = await client().getPage(pageOptions);
    // An untagged record is readable but does not match the requested tags
    assert.deepEqual(
      page.items.map((item) => item.id),
      ['readable'],
    );
    assert.equal(page.rawCount, 6);
    // A matching record without a recipient counts as skipped too
    assert.equal(page.skipped, 4);
    assert.deepEqual(page.lastTimestamp, end);
    sinon.assert.calledWithMatch(
      warn,
      /Skipped 4 unreadable or unattributable Mailgun Logs record/,
    );
    scope.done();
  });

  it('explains a rejected key without leaking credentials', async () => {
    const scope = nock('https://api.eu.mailgun.net').post('/v1/analytics/logs').reply(401, {});
    await assert.rejects(client().getPage(pageOptions), (error: Error & { status?: number }) => {
      assert.equal(error.status, 401);
      assert.match(error.message, /must be able to read account logs/);
      assert.equal(JSON.stringify(error).includes('test-api-key'), false);
      return true;
    });
    scope.done();
  });

  it.each([
    ['https://api.eu.mailgun.net/v3', 'https://api.eu.mailgun.net/v1/analytics/logs'],
    ['https://api.mailgun.net/v3/', 'https://api.mailgun.net/v1/analytics/logs'],
    ['https://proxy.example.com/mailgun/v3', 'https://proxy.example.com/mailgun/v1/analytics/logs'],
    ['https://api.mailgun.net', 'https://api.mailgun.net/v1/analytics/logs'],
  ])('derives the Logs endpoint from the base URL %s', (baseUrl, expected) => {
    assert.equal(resolveLogsUrl(baseUrl), expected);
  });

  it('rejects an invalid base URL when constructed', () => {
    assert.throws(() => new MailgunLogsClient({ apiKey: 'k', baseUrl: 'not a url' }), /base URL/);
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
    assert.equal(page.skipped, 0);
    // A record past the exact end is not covered: the request end is rounded up
    assert.deepEqual(page.lastTimestamp, new Date('2026-09-10T13:00:00.500Z'));
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
      rawCount: 1,
      skipped: 0,
      lastTimestamp: timestamp,
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
      rawCount: 1,
      skipped: 0,
      lastTimestamp: timestamp,
    });
    scope.done();
  });
});
