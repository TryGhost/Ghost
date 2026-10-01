import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sinon from 'sinon';
import nock from 'nock';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
import {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} from '../../utils/automations-fixtures';
import {
  countCursorScope,
  encodeCountCursor,
} from '../../../core/server/services/automations/automation-member-search-counts';
import type { EntryStatsWindow } from '../../../core/server/services/automations/automation-entry-stats';
const models = require('../../../core/server/models');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const configUtils = require('../../utils/config-utils');
const settingsCache = require('../../../core/shared/settings-cache');
const id = (n: number) => n.toString(16).padStart(24, '0');
const zero = { in_progress_run_count: 0, completed_run_count: 0, exited_early_run_count: 0 };
const window: EntryStatsWindow = {
  date_from: '2026-09-01',
  date_to: '2026-09-15',
  timezone: 'UTC',
  bucket: 'day',
};

describe('Member search performance API', () => {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let automationId: string, site: string;
  let previousTinybird: typeof TinybirdServiceWrapper.instance;
  beforeAll(async () => {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });
  beforeEach(async () => {
    sinon.stub(require('@tryghost/logging'), 'error');
    await setupAutomationsFixture();
    automationId = (await models.Base.knex('automations').first('id')).id;
    previousTinybird = TinybirdServiceWrapper.instance;
    site = randomUUID();
    configUtils.set('tinybird', {
      workspaceId: 'test-workspace',
      adminToken: 'test-token',
      stats: { endpoint: 'https://api.tinybird.co', id: site },
    });
    TinybirdServiceWrapper.init();
    mockManager.mockLabsEnabled('automationsTinybirdSync');
    sinon.useFakeTimers({ now: new Date('2026-09-14T12:00:00Z'), toFake: ['Date'] });
    await models.Base.knex('members').insert({
      id: id(1),
      uuid: randomUUID(),
      transient_id: id(99),
      name: 'Joanna',
      email: 'current@example.test',
      created_at: new Date(),
    });
  });
  afterEach(async () => {
    nock.cleanAll();
    sinon.restore();
    await cleanupAutomationsFixture();
    await models.Base.knex('members').where('id', id(1)).del();
    await configUtils.restore();
    mockManager.restore();
    TinybirdServiceWrapper.instance = previousTinybird;
  });
  async function seed(count = 3) {
    await models.Base.knex('automation_runs').insert(
      Array.from({ length: count }, (_, i) => ({
        id: id(i + 1),
        automation_id: automationId,
        member_id: id(1),
        member_email: 'historical@example.test',
        created_at: new Date('2026-09-14T01:00:00Z'),
        updated_at: new Date(),
      })),
    );
  }
  async function read(params: Record<string, string> = {}, status = 200, owner = automationId) {
    return (
      await agent
        .get(
          `automations/${owner}/performance-stats/?${new URLSearchParams({ search: 'anna', date_from: '2026-09-01', date_to: '2026-09-14', ...params })}`,
        )
        .expectStatus(status)
    ).body;
  }
  function aggregate(
    response: unknown,
    inspect: (params: Record<string, string>) => void = () => {},
    status = 200,
  ) {
    return nock('https://api.tinybird.co')
      .post(
        '/v0/pipes/api_automation_search_counts.json',
        (body: string | Record<string, string>) => {
          const params =
            typeof body === 'string' ? Object.fromEntries(new URLSearchParams(body)) : body;
          assert.equal(params.site_uuid, site);
          assert.equal(params.automation_id, automationId);
          assert.equal(params.run_status, undefined);
          inspect(params);
          return true;
        },
      )
      .reply(status, { data: response });
  }
  it('returns combined status totals and entry buckets for the same matching runs', async () => {
    await seed();
    const mock = aggregate(
      [
        {
          in_progress_run_count: 1,
          completed_run_count: 1,
          exited_early_run_count: 1,
          invalid_run_count: 0,
          entries: [['2026-09-14', 3]],
        },
      ],
      (params) => {
        assert.deepEqual(params.run_ids.split(',').sort(), [id(1), id(2), id(3)]);
        assert.equal(params.date_from, window.date_from);
        assert.equal(params.date_to, window.date_to);
        assert.equal(params.hourly, 'false');
      },
    );
    const result = await read();
    assert.deepEqual(result.automation_performance_stats, [
      {
        automation_id: automationId,
        total_run_count: 3,
        in_progress_run_count: 1,
        completed_run_count: 1,
        exited_early_run_count: 1,
      },
    ]);
    assert.deepEqual(result.meta.entry_window, window);
    assert.deepEqual(result.meta.entry_buckets, [{ date: '2026-09-14', count: 3 }]);
    assert.deepEqual(result.meta.pagination, { state: 'exhausted', next_cursor: null });
    assert.ok(mock.isDone());
  });
  it('returns zero totals without querying Tinybird when no members match', async () => {
    const mock = aggregate([], () => {}, 503);
    const result = await read();
    assert.deepEqual(result.automation_performance_stats, [
      { automation_id: automationId, ...zero, total_run_count: 0 },
    ]);
    assert.deepEqual(result.meta.entry_buckets, []);
    assert.equal(mock.isDone(), false);
  });
  it('uses hourly buckets for one local day and defaults date_to to today locally', async () => {
    await seed(1);
    const mock = aggregate(
      [
        {
          ...zero,
          completed_run_count: 1,
          invalid_run_count: 0,
          entries: [['2026-09-14T01:00:00Z', 1]],
        },
      ],
      (params) => {
        assert.equal(params.date_from, '2026-09-13');
        assert.equal(params.date_to, '2026-09-14');
        assert.equal(params.timezone, 'America/New_York');
        assert.equal(params.hourly, 'true');
      },
    );
    // 01:00 UTC is still September 13 in New York.
    sinon.restore();
    sinon.useFakeTimers({ now: new Date('2026-09-14T01:30:00Z'), toFake: ['Date'] });
    const { body } = await agent
      .get(
        `automations/${automationId}/performance-stats/?search=anna&date_from=2026-09-13&timezone=America/New_York`,
      )
      .expectStatus(200);
    assert.equal(body.meta.entry_window.bucket, 'hour');
    assert.equal(body.automation_performance_stats[0].total_run_count, 1);
    assert.ok(mock.isDone());
  });
  it('uses the unfiltered all-time calendar to keep the searched chart on the same range', async () => {
    await seed(1);
    const calendar = nock('https://api.tinybird.co')
      .get('/v0/pipes/api_automation_performance_stats.json')
      .query({
        ghost_client: 'server',
        site_uuid: site,
        automation_id: automationId,
        timezone: 'UTC',
      })
      .reply(200, {
        data: ['2026-09-01', '2026-09-14'].map((date) => ({
          date,
          ...zero,
          completed_run_count: 1,
          invalid_run_count: 0,
        })),
      });
    const mock = aggregate([
      { ...zero, completed_run_count: 1, invalid_run_count: 0, entries: [['2026-09-14', 1]] },
    ]);
    const { body } = await agent
      .get(`automations/${automationId}/performance-stats/?search=anna`)
      .expectStatus(200);
    assert.deepEqual(body.meta.entry_window, window);
    assert.ok(calendar.isDone());
    assert.ok(mock.isDone());
  });
  it('resumes signed progress without restarting the all-time calendar and rejects changed queries', async () => {
    await seed();
    const scope = countCursorScope(automationId, site, 'anna', {
      date_from: null,
      date_to: null,
      timezone: 'UTC',
    });
    const cursor = encodeCountCursor(
      {
        scope,
        after: id(2),
        upper: id(3),
        counts: { ...zero, completed_run_count: 2 },
        window,
      },
      settingsCache.get('admin_session_secret'),
    );
    const mock = aggregate(
      [{ ...zero, completed_run_count: 1, invalid_run_count: 0, entries: [['2026-09-14', 1]] }],
      (params) => assert.equal(params.run_ids, id(3)),
    );
    const { body } = await agent
      .get(
        `automations/${automationId}/performance-stats/?${new URLSearchParams({ search: 'anna', cursor })}`,
      )
      .expectStatus(200);
    assert.equal(body.automation_performance_stats[0].total_run_count, 3);
    assert.deepEqual(body.meta.entry_buckets, [{ date: '2026-09-14', count: 1 }]);
    assert.ok(mock.isDone());
    const bad = await agent
      .get(
        `automations/${automationId}/performance-stats/?${new URLSearchParams({ search: 'bert', cursor })}`,
      )
      .expectStatus(422);
    assert.equal(bad.body.errors[0].code, 'AUTOMATION_COUNT_CURSOR_INVALID');
  });
  it.each([
    { data: null, status: 503 },
    { data: [{ ...zero, invalid_run_count: 1, entries: [] }], status: 200 },
    { data: [{ ...zero, completed_run_count: 1, invalid_run_count: 0, entries: [] }], status: 200 },
  ])(
    'reports unavailable or inconsistent search stats as an error: %j',
    async ({ data, status }) => {
      await seed();
      const mock = aggregate(data, undefined, status);
      const result = await read({}, 500);
      assert.equal(result.errors[0].code, 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE');
      assert.ok(mock.isDone());
    },
  );
  it('rejects a count cursor without a search', async () => {
    const result = await read({ search: '', cursor: 'invalid' }, 422);
    assert.equal(result.errors[0].type, 'ValidationError');
  });
  it('requires automation read permission and rejects unknown automations', async () => {
    await agent.loginAsAuthor();
    try {
      await read({}, 403);
    } finally {
      await agent.loginAsOwner();
    }
    await read({}, 404, id(999));
  });
});
