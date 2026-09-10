import assert from 'node:assert/strict';
import nock from 'nock';
import sinon from 'sinon';
import { fetchMailgunEvents } from '../../../../../core/server/services/email-analytics/fetch-mailgun-events';
import type { MailgunAnalyticsEvent } from '../../../../../core/server/services/email-analytics/mailgun-logs-client';
// @ts-expect-error This module lacks type definitions.
import MailgunClient from '../../../../../core/server/services/lib/mailgun-client';

const begin = new Date('2026-09-01T12:00:00.250Z');
const end = new Date('2026-09-01T14:00:00.750Z');
const mailgun = {
  domain: 'primary.example.com',
  baseUrl: 'https://api.eu.mailgun.net/v3',
  apiKey: 'test-key',
};
const read = (values: Record<string, unknown>) => ({ get: (key: string) => values[key] });
const settings = read({});
const config = read({ bulkEmail: { mailgun }, 'emailAnalytics:fetchSource': 'logs' });

function event(id: string, domain = mailgun.domain, time = '2026-09-01T13:00:00Z') {
  return {
    id,
    event: 'opened',
    '@timestamp': time,
    domain: { name: domain },
    tags: ['bulk-email'],
    recipient: 'member@example.com',
    'user-variables': '{"email-id":"email-1"}',
  };
}

describe('fetchMailgunEvents with Logs selected', () => {
  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  afterEach(() => {
    nock.cleanAll();
    sinon.restore();
  });

  it.each(['bulk-email', 'automation-email', 'gift-delivery'])(
    'preserves normalized Events parity and all-tag isolation for %s',
    async (tag) => {
      const eventTypes = ['delivered', 'opened', 'failed', 'unsubscribed', 'complained'];
      const events = eventTypes.map((type) => ({
        ...event(type),
        event: type,
        tags: [tag, 'site-tag'],
        'user-variables': { 'email-id': 'email-1' },
        message: { headers: { 'message-id': 'provider-1' } },
      }));
      const scope = nock('https://api.eu.mailgun.net')
        .post('/v1/analytics/logs', (body) => {
          assert.deepEqual(body.events, eventTypes);
          assert.deepEqual(
            body.filter.AND.slice(1).map(
              (item: { values: { value: string }[] }) => item.values[0].value,
            ),
            [tag, 'site-tag'],
          );
          return true;
        })
        .reply(200, { items: events, pagination: {} });
      const normalized: MailgunAnalyticsEvent[] = [];
      await fetchMailgunEvents({
        config,
        settings,
        tags: [tag, 'site-tag'],
        begin,
        end,
        batchHandler: (items: MailgunAnalyticsEvent[]) => {
          normalized.push(...items);
        },
      });
      const legacy = new MailgunClient({ config, settings });
      assert.deepEqual(
        normalized,
        events.map((item) =>
          legacy.normalizeEvent({
            ...item,
            timestamp: new Date(item['@timestamp']).getTime() / 1000,
          }),
        ),
      );
      scope.done();
    },
  );

  it('rejects an unknown source instead of silently selecting a different API', async () => {
    await assert.rejects(
      fetchMailgunEvents({
        config: read({ 'emailAnalytics:fetchSource': 'unknown' }),
        settings,
        tags: ['bulk-email'],
        batchHandler: () => {},
      }),
      /Invalid emailAnalytics.fetchSource/,
    );
  });

  it.each([false, true])(
    'uses current settings unless config overrides them as a whole: %s',
    async (override) => {
      const configured = read({
        'emailAnalytics:fetchSource': 'logs',
        ...(override ? { bulkEmail: { mailgun } } : {}),
      });
      const stored = read({
        mailgun_api_key: 'settings-key',
        mailgun_domain: 'settings.example.com',
        mailgun_base_url: 'https://api.mailgun.net/v3',
      });
      const domain = override ? mailgun.domain : 'settings.example.com';
      const scope = nock(override ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net')
        .post('/v1/analytics/logs', (body) => body.filter.AND[0].values[0].value === domain)
        .basicAuth({ user: 'api', pass: override ? 'test-key' : 'settings-key' })
        .reply(200, { items: [], pagination: {} });
      await fetchMailgunEvents({
        config: configured,
        settings: stored,
        tags: ['bulk-email'],
        begin,
        end,
        batchHandler: () => assert.fail('Unexpected events'),
      });
      scope.done();
    },
  );

  it('fetches a duplicate fallback domain only once and continues past filtered-only pages', async () => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, {
        items: [event('other-site', 'different.example.com')],
        pagination: { next: 'next' },
      })
      .post('/v1/analytics/logs', (body) => body.pagination.token === 'next')
      .reply(200, { items: [event('ours')], pagination: {} });
    const ids: string[] = [];
    await fetchMailgunEvents({
      config: read({
        bulkEmail: { mailgun },
        'emailAnalytics:fetchSource': 'logs',
        'hostSettings:managedEmail:fallbackDomain': mailgun.domain,
      }),
      settings,
      tags: ['bulk-email'],
      begin,
      end,
      batchHandler: (items: MailgunAnalyticsEvent[]) => {
        ids.push(...items.map((item) => item.id));
      },
    });
    assert.deepEqual(ids, ['ours']);
    scope.done();
  });

  it('propagates processing failure before requesting another page or domain', async () => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, { items: [event('one')], pagination: { next: 'next' } });
    const later = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, { items: [], pagination: {} });
    const failure = new Error('Processing failed');
    await assert.rejects(
      fetchMailgunEvents({
        config,
        settings,
        tags: ['bulk-email'],
        begin,
        end,
        batchHandler: () => {
          throw failure;
        },
      }),
      (error) => error === failure,
    );
    assert.equal(later.isDone(), false);
    scope.done();
  });

  it('propagates a later-domain failure so the caller can retry the full window', async () => {
    const scope = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .reply(200, { items: [event('primary')], pagination: {} })
      .post('/v1/analytics/logs')
      .reply(503, {});
    const ids: string[] = [];
    await assert.rejects(
      fetchMailgunEvents({
        config: read({
          bulkEmail: { mailgun },
          'emailAnalytics:fetchSource': 'logs',
          'hostSettings:managedEmail:fallbackDomain': 'fallback.example.com',
        }),
        settings,
        tags: ['bulk-email'],
        begin,
        end,
        batchHandler: (items: MailgunAnalyticsEvent[]) => {
          ids.push(...items.map((item) => item.id));
        },
      }),
      /Mailgun Logs request failed/,
    );
    assert.deepEqual(ids, ['primary']);
    scope.done();
  });

  it('does not make a request when credentials are absent', async () => {
    const result = await fetchMailgunEvents({
      config: read({ 'emailAnalytics:fetchSource': 'logs' }),
      settings,
      tags: ['bulk-email'],
      begin,
      end,
      batchHandler: () => assert.fail('Unexpected events'),
    });
    assert.equal(result, undefined);
  });

  it('freezes the end at fetch start across every page of a long run', async () => {
    const clock = sinon.useFakeTimers({ now: new Date('2026-09-01T13:30:00Z'), toFake: ['Date'] });
    const pages = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs', (body) => body.end === 'Tue, 01 Sep 2026 13:30:00 -0000')
      .reply(200, { items: [event('first')], pagination: { next: 'next' } })
      .post('/v1/analytics/logs', (body) => body.end === 'Tue, 01 Sep 2026 13:30:00 -0000')
      .reply(200, {
        items: [event('too-new', mailgun.domain, '2026-09-01T13:45:00Z')],
        pagination: {},
      });
    const ids: string[] = [];
    await fetchMailgunEvents({
      config,
      settings,
      tags: ['bulk-email'],
      begin,
      end,
      batchHandler: (items: MailgunAnalyticsEvent[]) => {
        ids.push(...items.map((item) => item.id));
        clock.setSystemTime(end);
      },
    });
    assert.deepEqual(ids, ['first']);
    pages.done();
  });

  it('rejects repeated pagination tokens before delivering the repeated page', async () => {
    const pages = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs')
      .twice()
      .reply(200, { items: [event('same')], pagination: { next: 'repeated' } });
    const ids: string[] = [];
    await assert.rejects(
      fetchMailgunEvents({
        config,
        settings,
        tags: ['bulk-email'],
        begin,
        end,
        batchHandler: (items: MailgunAnalyticsEvent[]) => {
          ids.push(...items.map((item) => item.id));
        },
      }),
      /Invalid Mailgun Logs pagination/,
    );
    assert.deepEqual(ids, ['same']);
    pages.done();
  });

  it('finishes begin-time ties and returns the earliest capped cursor across sending domains', async () => {
    const fallback = 'fallback.example.com';
    const primaryFirst = nock('https://api.eu.mailgun.net')
      .post(
        '/v1/analytics/logs',
        (body) => body.filter.AND[0].values[0].value === mailgun.domain && !body.pagination.token,
      )
      .reply(200, {
        items: [event('tie', mailgun.domain, begin.toISOString())],
        pagination: { next: 'primary-two' },
      });
    const primarySecond = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs', (body) => body.pagination.token === 'primary-two')
      .reply(200, { items: [event('primary')], pagination: { next: 'primary-three' } });
    const fallbackFirst = nock('https://api.eu.mailgun.net')
      .post(
        '/v1/analytics/logs',
        (body) => body.filter.AND[0].values[0].value === fallback && !body.pagination.token,
      )
      .reply(200, {
        items: [event('fallback', fallback, '2026-09-01T12:30:00Z')],
        pagination: { next: 'fallback-two' },
      });
    const ids: string[] = [];
    const result = await fetchMailgunEvents({
      config: read({
        bulkEmail: { mailgun },
        'emailAnalytics:fetchSource': 'logs',
        'hostSettings:managedEmail:fallbackDomain': fallback,
      }),
      settings,
      tags: ['bulk-email'],
      begin,
      end,
      events: ['opened'],
      maxEvents: 1,
      batchHandler: (items: MailgunAnalyticsEvent[]) => {
        ids.push(...items.map((item) => item.id));
      },
    });
    assert.deepEqual(ids, ['tie', 'primary', 'fallback']);
    assert.deepEqual(result, { safeCursor: new Date('2026-09-01T12:30:00Z') });
    primaryFirst.done();
    primarySecond.done();
    fallbackFirst.done();
  });

  it('uses the configured Logs endpoint and delivers normalized pages in order', async () => {
    const first = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs', (body) => !body.pagination.token)
      .reply(200, { items: [event('one')], pagination: { next: 'page-two' } });
    const second = nock('https://api.eu.mailgun.net')
      .post('/v1/analytics/logs', (body) => body.pagination.token === 'page-two')
      .reply(200, { items: [event('two')], pagination: {} });
    const ids: string[] = [];
    const result = await fetchMailgunEvents({
      config,
      settings,
      tags: ['bulk-email'],
      begin,
      end,
      events: ['opened'],
      batchHandler: async (items: MailgunAnalyticsEvent[]) => {
        ids.push(...items.map((item) => item.id));
      },
    });
    assert.deepEqual(ids, ['one', 'two']);
    assert.deepEqual(result, { safeCursor: undefined });
    first.done();
    second.done();
  });
});
