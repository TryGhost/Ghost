const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const nock = require('nock');
const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../../utils/automations-fixtures');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const id = (n) => n.toString(16).padStart(24, '0');
const time = '2026-01-01T00:00:00.000Z';
const row = (n) => ({ id: id(n), created_at: time, status: 'completed', failed: false });

describe('Automation member search API', () => {
  let agent, automationId, otherId, previousTinybird, site;
  beforeAll(async () => {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });
  beforeEach(async () => {
    await setupAutomationsFixture();
    [automationId, otherId] = (await models.Base.knex('automations').select('id')).map(
      (item) => item.id,
    );
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
      name: 'Joanna',
      email: 'current@example.test',
      created_at: new Date(time),
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
    for (let i = 0; i < count; i += 500) {
      await models.Base.knex('automation_runs').insert(
        Array.from({ length: Math.min(500, count - i) }, (_, j) => ({
          id: id(start + i + j),
          automation_id: owner,
          member_id: member,
          member_email: 'historical@example.test',
          created_at: new Date(time),
          updated_at: new Date(time),
        })),
      );
    }
  }
  async function read(params = {}, status = 200, owner = automationId) {
    return (
      await agent
        .get(`automations/${owner}/runs/?${new URLSearchParams({ search: 'anna', ...params })}`)
        .expectStatus(status)
    ).body;
  }
  function tb(rows, inspect = () => {}, status = 200) {
    return nock('https://api.tinybird.co')
      .post('/v0/pipes/api_automation_run_search.json', (body) => {
        const p = typeof body === 'string' ? Object.fromEntries(new URLSearchParams(body)) : body;
        assert.equal(p.site_uuid, site);
        assert.equal(p.automation_id, automationId);
        inspect(p);
        return true;
      })
      .reply(status, { data: rows });
  }
  it.each(['asc', 'desc'])(
    'returns complete small-match pages in %s order with current repeat-member details',
    async (direction) => {
      await seed(125);
      const all = Array.from({ length: 125 }, (_, i) => row(direction === 'asc' ? i + 1 : 125 - i));
      let cursor;
      const found = [];
      for (let offset = 0; offset < 125; offset += 50) {
        const mock = tb(all.slice(offset, offset + 51), (p) => {
          assert.equal(p.limit, '51');
          assert.equal(p.sort_direction, direction);
          assert.equal(p.run_ids.split(',').length, 125);
          if (cursor) {
            assert.equal(p.after_id, all[offset - 1].id);
          }
        });
        const r = await read({
          search: '  anna  ',
          order: `created_at ${direction}`,
          ...(cursor ? { cursor } : {}),
        });
        assert.deepEqual(r.meta.search, { version: 1, query: 'anna', matching: 'contains' });
        assert.equal(r.meta.order, `created_at ${direction}`);
        assert.equal(r.automation_runs[0].member.name, 'Joanna');
        found.push(...r.automation_runs.map((item) => item.id));
        cursor = r.meta.pagination.next_cursor;
        assert.ok(mock.isDone());
      }
      assert.equal(cursor, null);
      assert.deepEqual(
        found,
        all.map((item) => item.id),
      );
    },
  );
  it('discards an overflowing probe instead of imposing a 2000-match cap', async () => {
    await seed(2055);
    const mock = tb(
      Array.from({ length: 2055 }, (_, i) => row(i + 1)),
      (p) => {
        assert.equal(p.limit, '5000');
        assert.equal(p.run_ids, undefined);
      },
    );
    const r = await read({ order: 'created_at asc' });
    assert.equal(r.automation_runs.length, 50);
    assert.equal(r.meta.pagination.state, 'more');
    assert.ok(mock.isDone());
    const next = tb(
      Array.from({ length: 5 }, (_, i) => row(2051 + i)),
      (p) => assert.equal(p.after_id, id(2050)),
    );
    const token = JSON.parse(Buffer.from(r.meta.pagination.next_cursor, 'base64url').toString());
    token.id = id(2050);
    const last = await read({
      order: 'created_at asc',
      cursor: Buffer.from(JSON.stringify(token)).toString('base64url'),
    });
    assert.deepEqual(
      last.automation_runs.map((item) => item.id),
      [2051, 2052, 2053, 2054, 2055].map(id),
    );
    assert.equal(last.meta.pagination.next_cursor, null);
    assert.ok(next.isDone());
  });
  it('checks pipe capability even when there are no matches', async () => {
    const mock = tb([], (p) => assert.equal(p.run_ids, ''));
    const r = await read();
    assert.deepEqual(r.automation_runs, []);
    assert.equal(r.meta.pagination.state, 'exhausted');
    assert.ok(mock.isDone());
  });
  it('reports an unavailable pipe instead of successful empty search', async () => {
    const mock = tb([], () => {}, 404);
    const r = await read({}, 500);
    assert.equal(r.errors[0].code, 'AUTOMATION_MEMBER_SEARCH_UNAVAILABLE');
    assert.ok(mock.isDone());
  });
  it.each(['%', '_', '!', '\\', 'renee', 'current@'])(
    'matches current name/email literally (%s)',
    async (search) => {
      await seed(1);
      await models.Base.knex('members').where('id', id(1)).update({ name: 'Renée %_!\\' });
      const mock = tb([row(1)], (p) => assert.equal(p.run_ids, id(1)));
      const r = await read({ search });
      assert.equal(r.automation_runs.length, 1);
      assert.ok(mock.isDone());
    },
  );
  it('excludes other automations, missing members and historical emails', async () => {
    await seed(1, 1, otherId);
    await seed(1, 2, automationId, null);
    const mock = tb([], (p) => assert.equal(p.run_ids, ''));
    await read({ search: 'historical' });
    assert.ok(mock.isDone());
  });
  it('keeps blank search on the old endpoint and old cursor shape', async () => {
    const mock = nock('https://api.tinybird.co')
      .get('/v0/pipes/api_automation_runs.json')
      .query(true)
      .reply(200, { data: [] });
    const r = await read({ search: '   ' });
    assert.equal(r.meta.search, undefined);
    assert.deepEqual(r.meta.pagination, { limit: 50, next_cursor: null });
    assert.ok(mock.isDone());
  });
  it('rejects changed query/status/order/automation/site and non-search cursors before analytics', async () => {
    await seed(51);
    tb(Array.from({ length: 51 }, (_, i) => row(i + 1)));
    const first = await read({ order: 'created_at asc' });
    const cursor = first.meta.pagination.next_cursor;
    for (const params of [
      { search: 'bert' },
      { status: 'completed' },
      { order: 'created_at desc' },
      { search: '' },
    ]) {
      await read({ order: 'created_at asc', cursor, ...params }, 422);
    }
    await read({ order: 'created_at asc', cursor }, 422, otherId);
    configUtils.set('tinybird:stats:id', randomUUID());
    await read({ order: 'created_at asc', cursor }, 422);
    const old = Buffer.from(
      JSON.stringify({
        automation_id: automationId,
        status: null,
        direction: 'asc',
        id: id(1),
        created_at: time,
      }),
    ).toString('base64url');
    await read({ order: 'created_at asc', cursor: old }, 422);
  });
  it.each(['x'.repeat(4097)])('rejects excessive input', async (search) => {
    await read({ search }, 422);
  });
  it('requires automation read permission', async () => {
    await agent.loginAsAuthor();
    try {
      await read({}, 403);
    } finally {
      await agent.loginAsOwner();
    }
  });
  it('returns 404 for an unknown automation', async () => {
    await read({}, 404, id(999));
  });
  it('rejects results outside the complete SQL match set', async () => {
    await seed(1);
    const mock = tb([row(2)]);
    await read({}, 500);
    assert.ok(mock.isDone());
  });
  it('aborts a slow Tinybird request without retry or partial success', async () => {
    const mock = nock('https://api.tinybird.co')
      .post('/v0/pipes/api_automation_run_search.json')
      .delay(10000)
      .reply(200, { data: [] });
    const start = performance.now();
    const result = await read({}, 500);
    assert.equal(result.errors[0].code, 'AUTOMATION_MEMBER_SEARCH_UNAVAILABLE');
    assert.ok(performance.now() - start < 5000, 'Abort should precede the ten-second response');
    assert.ok(mock.isDone());
  }, 7000);

  it('cancels MySQL work rather than leaving a timed-out query running', async () => {
    await assert.rejects(
      models.Base.knex
        .raw('SELECT SLEEP(10) /* ny1614 cancellation */')
        .timeout(25, { cancel: true }),
    );
    const [processes] = await models.Base.knex.raw('SHOW PROCESSLIST');
    assert.ok(processes.every((item) => !item.Info?.includes('ny1614 cancellation')));
  });
  it('preserves the same continuation when current membership switches query strategies', async () => {
    await seed(2055);
    tb(
      Array.from({ length: 2055 }, (_, i) => row(i + 1)),
      (params) => assert.equal(params.run_ids, undefined),
    );
    const first = await read({ order: 'created_at asc' });
    await models.Base.knex('automation_runs')
      .where('automation_id', automationId)
      .where('id', '<=', id(60))
      .update({ member_id: null });
    const small = tb(
      Array.from({ length: 51 }, (_, i) => row(i + 61)),
      (params) => {
        assert.equal(params.after_id, id(50));
        assert.equal(params.run_ids.split(',').length, 1995);
      },
    );
    const second = await read({
      order: 'created_at asc',
      cursor: first.meta.pagination.next_cursor,
    });
    assert.equal(second.automation_runs[0].id, id(61));
    assert.ok(small.isDone());
    await models.Base.knex('automation_runs')
      .where('automation_id', automationId)
      .where('id', '<=', id(60))
      .update({ member_id: id(1) });
    const large = tb(
      Array.from({ length: 1945 }, (_, i) => row(i + 111)),
      (params) => {
        assert.equal(params.after_id, id(110));
        assert.equal(params.run_ids, undefined);
      },
    );
    const third = await read({
      order: 'created_at asc',
      cursor: second.meta.pagination.next_cursor,
    });
    assert.equal(third.automation_runs[0].id, id(111));
    assert.ok(large.isDone());
  });
});
