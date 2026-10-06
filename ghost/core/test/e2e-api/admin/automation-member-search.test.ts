import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { AutomationRunRow } from '../../../core/server/services/automations/tinybird-automation-stats';
const { randomUUID } = require('node:crypto');
const nock = require('nock');
const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../../utils/automations-fixtures');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const id = (n: number) => n.toString(16).padStart(24, '0');
const time = '2026-01-01T00:00:00.000Z';
const row = (n: number): AutomationRunRow => ({
  id: id(n),
  created_at: time,
  status: 'completed',
  failed: false,
});

describe('Automation member search API', () => {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let automationId: string, otherId: string, site: string;
  let previousTinybird: typeof TinybirdServiceWrapper.instance;
  beforeAll(async () => {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });
  beforeEach(async () => {
    sinon.stub(require('@tryghost/logging'), 'error');
    await setupAutomationsFixture();
    [automationId, otherId] = (await models.Base.knex('automations').select('id')).map(
      (item: { id: string }) => item.id,
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
    sinon.restore();
    await cleanupAutomationsFixture();
    await models.Base.knex('members').where('id', id(1)).del();
    await configUtils.restore();
    mockManager.restore();
    TinybirdServiceWrapper.instance = previousTinybird;
  });
  async function seed(
    count: number,
    start = 1,
    owner = automationId,
    member: string | null = id(1),
  ) {
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
  async function read(params: Record<string, string> = {}, status = 200, owner = automationId) {
    return (
      await agent
        .get(`automations/${owner}/runs/?${new URLSearchParams({ search: 'anna', ...params })}`)
        .expectStatus(status)
    ).body;
  }
  function tb(
    rows: AutomationRunRow[],
    inspect: (params: Record<string, string>) => void = () => {},
    status = 200,
  ) {
    return nock('https://api.tinybird.co')
      .post('/v0/pipes/api_automation_run_search.json', (body: string | Record<string, string>) => {
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
      await seed(51);
      const all = Array.from({ length: 51 }, (_, i) => row(direction === 'asc' ? i + 1 : 51 - i));
      let cursor: string | null = null;
      const found: string[] = [];
      for (let offset = 0; offset < 51; offset += 50) {
        const mock = tb(all.slice(offset, offset + 51), (p) => {
          assert.equal(p.limit, '51');
          assert.equal(p.sort_direction, direction);
          assert.equal(p.run_ids.split(',').length, 51);
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
        found.push(...r.automation_runs.map((item: { id: string }) => item.id));
        cursor = r.meta.pagination.next_cursor;
        assert.ok(mock.isDone());
      }
      assert.equal(cursor, null);
      assert.deepEqual(
        found,
        all.map((item: { id: string }) => item.id),
      );
    },
  );
  it('searches all time and statuses regardless of browse filters', async () => {
    await seed(2);
    const rows: AutomationRunRow[] = [row(2), { ...row(1), status: 'in_progress' }];
    const mock = tb(rows, (params) => {
      assert.equal(params.run_status, undefined);
      assert.equal(params.date_from, undefined);
      assert.equal(params.date_to, undefined);
    });
    const result = await read({
      status: 'completed',
      date_from: '2020-01-01',
      date_to: '2020-01-02',
    });
    assert.deepEqual(
      result.automation_runs.map((run: { status: string }) => run.status),
      ['completed', 'in_progress'],
    );
    assert.ok(mock.isDone());
  });
  it('traverses every match when the SQL probe overflows', async () => {
    await seed(2055);
    const all = Array.from({ length: 2055 }, (_, i) => row(i + 1));
    let cursor: string | null = null;
    const found: string[] = [];
    for (let offset = 0; offset < all.length; offset += 50) {
      const mock = tb(all.slice(offset), (params) => {
        assert.equal(params.limit, '5000');
        assert.equal(params.run_ids, undefined);
        if (cursor) {
          assert.equal(params.after_id, all[offset - 1].id);
        }
      });
      const result = await read({
        order: 'created_at asc',
        ...(cursor ? { cursor } : {}),
      });
      found.push(...result.automation_runs.map((run: { id: string }) => run.id));
      cursor = result.meta.pagination.next_cursor;
      assert.ok(mock.isDone());
    }
    assert.equal(cursor, null);
    assert.deepEqual(
      found,
      all.map((run) => run.id),
    );
  });
  it('returns an exhausted empty result without querying Tinybird when no members match', async () => {
    const r = await read();
    assert.deepEqual(r.automation_runs, []);
    assert.equal(r.meta.pagination.state, 'exhausted');
  });
  it('reports a failed analytics request when matching runs need classification', async () => {
    await seed(1);
    const mock = tb([], () => {}, 503);
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
      // A wildcard interpretation would incorrectly match this member too.
      await models.Base.knex('members').where('id', id(1)).update({
        name: 'Unrelated member',
        email: 'other@example.test',
      });
      assert.deepEqual((await read({ search })).automation_runs, []);
    },
  );
  it('excludes other automations, missing members and historical emails', async () => {
    await seed(1, 1, otherId);
    await seed(1, 2, automationId, null);
    for (const search of ['anna', 'historical']) {
      const result = await read({ search });
      assert.deepEqual(result.automation_runs, []);
    }
  });
  it('treats blank search as ordinary browsing', async () => {
    const mock = nock('https://api.tinybird.co')
      .get('/v0/pipes/api_automation_runs.json')
      .query(true)
      .reply(200, { data: [] });
    const r = await read({ search: '   ' });
    assert.equal(r.meta.search, undefined);
    assert.deepEqual(r.meta.pagination, { limit: 50, next_cursor: null });
    assert.ok(mock.isDone());
  });
  it('rejects cursors after changing the search, order, automation or site', async () => {
    await seed(51);
    tb(Array.from({ length: 51 }, (_, i) => row(i + 1)));
    const first = await read({ order: 'created_at asc' });
    const cursor = first.meta.pagination.next_cursor;
    const changes: Record<string, string>[] = [
      { search: 'bert' },
      { order: 'created_at desc' },
      { search: '' },
    ];
    for (const params of changes) {
      await read({ order: 'created_at asc', cursor, ...params }, 422);
    }
    await read({ order: 'created_at asc', cursor }, 422, otherId);
    configUtils.set('tinybird:stats:id', randomUUID());
    await read({ order: 'created_at asc', cursor }, 422);
  });
  it('rejects excessive input', async () => {
    await read({ search: 'x'.repeat(4097) }, 422);
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
    await seed(1);
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
