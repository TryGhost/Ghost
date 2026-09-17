const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const nock = require('nock');
const models = require('../../../core/server/models');
const settingsCache = require('../../../core/shared/settings-cache');
const configUtils = require('../../utils/config-utils');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../../utils/automations-fixtures');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const {
  encodeCountCursor,
  countCursorScope,
} = require('../../../core/server/services/automations/automation-member-search-counts');
const id = (n) => n.toString(16).padStart(24, '0');
const zero = {
  in_progress_run_count: 0,
  completed_run_count: 0,
  exited_early_run_count: 0,
  unclassified_run_count: 0,
};

describe('Search-scoped automation counts API', () => {
  let agent, automationId, otherId, site, previousTinybird;
  beforeAll(async () => {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });
  beforeEach(async () => {
    await setupAutomationsFixture();
    [automationId, otherId] = (await models.Base.knex('automations').select('id')).map((r) => r.id);
    previousTinybird = TinybirdServiceWrapper.instance;
    site = randomUUID();
    configUtils.set('tinybird', {
      workspaceId: 'test-workspace',
      adminToken: 'test-token',
      stats: { endpoint: 'https://api.tinybird.co', id: site },
    });
    TinybirdServiceWrapper.init();
    mockManager.mockLabsEnabled('automationsTinybirdSync');
    await models.Base.knex('members').insert({
      id: id(1),
      uuid: randomUUID(),
      transient_id: id(99),
      name: 'Joanna %_!\\',
      email: 'current@example.test',
      created_at: new Date(),
    });
  });
  afterEach(async () => {
    nock.cleanAll();
    await cleanupAutomationsFixture();
    await models.Base.knex('members').where('id', id(1)).del();
    await configUtils.restore();
    mockManager.restore();
    TinybirdServiceWrapper.instance = previousTinybird;
  });
  async function seed(count, start = 1, owner = automationId, member = id(1)) {
    for (let i = 0; i < count; i += 1000) {
      await models.Base.knex('automation_runs').insert(
        Array.from({ length: Math.min(1000, count - i) }, (_, j) => ({
          id: id(start + i + j),
          automation_id: owner,
          member_id: member,
          member_email: 'historical@example.test',
          created_at: new Date(),
          updated_at: new Date(),
        })),
      );
    }
  }
  async function read(params = {}, status = 200, owner = automationId) {
    return (
      await agent
        .get(
          `automations/${owner}/status-stats/?${new URLSearchParams({ search: 'anna', ...params })}`,
        )
        .expectStatus(status)
    ).body;
  }
  function mockCounts(override) {
    const requests = [];
    const mock = nock('https://api.tinybird.co')
      .persist()
      .post('/v0/pipes/api_automation_search_counts.json')
      .reply(200, (_, body) => {
        const p = typeof body === 'string' ? Object.fromEntries(new URLSearchParams(body)) : body;
        requests.push(p);
        assert.equal(p.site_uuid, site);
        assert.equal(p.automation_id, automationId);
        const counts = { ...zero };
        for (const run of p.run_ids.split(',').filter(Boolean)) {
          counts[Object.keys(counts)[parseInt(run, 16) % 4]] += 1;
        }
        return { data: override ?? [counts] };
      });
    return { mock, requests };
  }
  it('counts all matching runs and statuses beyond the list page, independently of status/order options', async () => {
    await seed(120);
    const tb = mockCounts();
    const result = await read({ search: '  anna ', status: 'completed', order: 'created_at asc' });
    assert.deepEqual(result.automation_status_stats, [
      {
        automation_id: automationId,
        in_progress_run_count: 30,
        completed_run_count: 30,
        exited_early_run_count: 30,
        unclassified_run_count: 30,
      },
    ]);
    assert.deepEqual(result.meta.search, { version: 1, query: 'anna', matching: 'contains' });
    assert.deepEqual(result.meta.pagination, { state: 'exhausted', next_cursor: null });
    assert.equal(tb.requests[0].run_ids.split(',').length, 120);
  });
  it('returns only completed totals across multiple signed continuations and retries', async () => {
    await seed(33000);
    const tb = mockCounts();
    const first = await read();
    assert.deepEqual(first.automation_status_stats, []);
    assert.equal(first.meta.pagination.state, 'scanning');
    let cursor = first.meta.pagination.next_cursor;
    let result;
    for (let page = 0; cursor && page < 10; page++) {
      result = await read({ cursor });
      const retry = await read({ cursor });
      assert.deepEqual(retry, result);
      if (result.meta.pagination.next_cursor) {
        assert.deepEqual(result.automation_status_stats, []);
      }
      cursor = result.meta.pagination.next_cursor;
    }
    assert.equal(cursor, null);
    assert.deepEqual(result.automation_status_stats, [
      {
        automation_id: automationId,
        in_progress_run_count: 8250,
        completed_run_count: 8250,
        exited_early_run_count: 8250,
        unclassified_run_count: 8250,
      },
    ]);
    assert.ok(tb.requests.every((p) => p.run_ids.split(',').filter(Boolean).length <= 8000));
  });
  it.each(['%', '_', '!', '\\', 'current@'])(
    'uses literal current-member matching for %s',
    async (search) => {
      await seed(1);
      mockCounts();
      const result = await read({ search });
      assert.equal(result.automation_status_stats[0].completed_run_count, 1);
    },
  );
  it('excludes missing members, historical identity and other automations', async () => {
    await seed(2, 1, otherId);
    await seed(2, 3, automationId, null);
    mockCounts();
    const result = await read({ search: 'historical' });
    assert.deepEqual(result.automation_status_stats, [{ automation_id: automationId, ...zero }]);
  });
  it('retains the unsearched response when search is cleared', async () => {
    const tb = nock('https://api.tinybird.co')
      .get('/v0/pipes/api_automation_status_stats.json')
      .query(true)
      .reply(200, { data: [zero] });
    const result = await read({ search: ' ' });
    assert.deepEqual(result.automation_status_stats, [{ automation_id: automationId, ...zero }]);
    assert.equal(result.meta, undefined);
    assert.ok(tb.isDone());
  });
  it('rejects altered/scope-mismatched/expired tokens and list tokens before run queries', async () => {
    const scope = countCursorScope(automationId, site, 'anna');
    const secret = settingsCache.get('admin_session_secret');
    const value = {
      scope,
      after: id(10),
      upper: id(99),
      counts: zero,
      expires: Date.now() + 900000,
    };
    const valid = encodeCountCursor(value, secret);
    const queries = [];
    const capture = (q) => queries.push(q.sql);
    models.Base.knex.on('query', capture);
    try {
      for (const params of [
        { search: 'bert' },
        { search: '' },
        { cursor: valid + 'x' },
        { cursor: 'list-token' },
        { cursor: encodeCountCursor({ ...value, expires: Date.now() - 1 }, secret) },
      ]) {
        await read({ cursor: valid, ...params }, 422);
      }
      await read({ cursor: valid }, 422, otherId);
      configUtils.set('tinybird:stats:id', randomUUID());
      await read({ cursor: valid }, 422);
      assert.ok(queries.every((sql) => !sql.includes('automation_runs')));
    } finally {
      models.Base.knex.removeListener('query', capture);
    }
  });
  it.each(
    [
      [],
      [{ ...zero, completed_run_count: -1 }],
      [{ ...zero, completed_run_count: 2 }],
      [{ ...zero, completed_run_count: 'no' }],
    ].map((response) => ({ response })),
  )('rejects invalid aggregates instead of zero or partial success', async ({ response }) => {
    await seed(1);
    mockCounts(response);
    await read({}, 500);
  });
  it('requires the count pipe even when there are no SQL matches', async () => {
    const tb = nock('https://api.tinybird.co')
      .post('/v0/pipes/api_automation_search_counts.json')
      .reply(404, {});
    const result = await read({}, 500);
    assert.equal(result.errors[0].code, 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE');
    assert.ok(tb.isDone());
  });
  it('requires automation read permission and a known automation', async () => {
    await read({}, 404, id(999));
    await agent.loginAsAuthor();
    try {
      await read({}, 403);
    } finally {
      await agent.loginAsOwner();
    }
  });
  it('rejects excessive input and continuation on cleared search', async () => {
    await read({ search: 'x'.repeat(4097) }, 422);
    await read({ search: ' ', cursor: 'anything' }, 422);
  });
});
