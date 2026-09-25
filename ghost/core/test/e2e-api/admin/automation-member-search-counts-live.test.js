const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { setupAutomationsFixture } = require('../../utils/automations-fixtures');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const configFile = process.env.AUTOMATION_TINYBIRD_TEST_CONFIG;
const benchmark = process.env.AUTOMATION_COUNT_BENCHMARK === '1';
const count = benchmark ? 200000 : 33000;
const id = (n) => n.toString(16).padStart(24, '0');
const stamp = (n) => new Date(Date.UTC(2026, 0, 1) + Math.floor(n / 10) * 1000).toISOString();
const status = (n) =>
  n % 1000 === 0
    ? 'exited_early'
    : n % 10 === 2
      ? 'completed'
      : n % 10 === 3
        ? 'unclassified'
        : 'in_progress';

describe.skipIf(!configFile)('Search counts with real Core, MySQL and Tinybird', () => {
  let agent, local, automationId, site, previousTinybird;
  async function append(name, rows) {
    const r = await fetch(
      `${local.endpoint}/v0/events?name=${name === '_mv_automation_runs' ? 'automation_run_events' : 'automation_run_step_events'}&wait=true`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${local.token}`, 'Content-Type': 'application/x-ndjson' },
        body: rows
          .map((row) =>
            JSON.stringify({
              site_uuid: row.site_uuid,
              id: row.id,
              updated_at: row.updated_at,
              payload: JSON.stringify(row),
            }),
          )
          .join('\n'),
      },
    );
    assert.equal(r.status, 200, await r.text());
  }
  const memberIndex = (n) => (n >= count - 2100 ? 20000 : n % 20000);
  const name = (n) =>
    n === 20000 ? 'Late Match' : n === 19999 ? 'Needle Unique' : n % 2 ? 'Bert' : 'Anna';
  const matches = (n, q) =>
    n % 997 !== 0 &&
    (name(memberIndex(n)).toLowerCase().includes(q.toLowerCase()) ||
      `u${memberIndex(n)}@bench.test`.includes(q.toLowerCase()));
  const expected = (q, s, dir) =>
    Array.from({ length: count }, (_, i) => i)
      .filter((n) => matches(n, q) && (!s || status(n) === s))
      .sort((a, b) => (dir === 'asc' ? a - b : b - a));
  async function read(q, direction = 'asc', filter, cursor) {
    const params = new URLSearchParams({
      search: q,
      order: `created_at ${direction}`,
      ...(filter ? { status: filter } : {}),
      ...(cursor ? { cursor } : {}),
    });
    return (await agent.get(`automations/${automationId}/runs/?${params}`).expectStatus(200)).body;
  }
  async function traverse(q, direction, filter) {
    let cursor;
    const ids = [];
    for (let page = 0; page < 100; page++) {
      const r = await read(q, direction, filter, cursor);
      ids.push(...r.automation_runs.map((item) => item.id));
      cursor = r.meta.pagination.next_cursor;
      if (!cursor) {
        assert.equal(r.meta.pagination.state, 'exhausted');
        return ids;
      }
    }
    assert.fail('Traversal failed to terminate');
  }
  beforeAll(async () => {
    local = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const url = new URL(local.endpoint);
    assert.equal(url.hostname, '127.0.0.1');
    assert.equal(url.protocol, 'http:');
    assert.notEqual(url.port, '7181');
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
    await setupAutomationsFixture();
    automationId = (await models.Base.knex('automations').first('id')).id;
    previousTinybird = TinybirdServiceWrapper.instance;
    site = randomUUID();
    configUtils.set('tinybird', { stats: { id: site, local: { enabled: true, ...local } } });
    TinybirdServiceWrapper.init();
    mockManager.mockLabsEnabled('automationsTinybirdSync');
    for (let start = 0; start <= 20000; start += 500) {
      await models.Base.knex('members').insert(
        Array.from({ length: Math.min(500, 20001 - start) }, (_, j) => ({
          id: id(1000000 + start + j),
          uuid: randomUUID(),
          transient_id: id(2000000 + start + j),
          name: name(start + j),
          email: `u${start + j}@bench.test`,
          created_at: new Date(stamp(0)),
        })),
      );
    }
    for (let start = 0; start < count; start += 10000) {
      if (benchmark && start % 20000 === 0) {
        process.stdout.write(`NY1615_SEED ${start}/${count}\n`);
      }
      const runs = Array.from({ length: Math.min(10000, count - start) }, (_, j) => {
        const n = start + j;
        return {
          id: id(n + 1),
          automation_id: automationId,
          created_at: stamp(n),
          updated_at: stamp(n),
        };
      });
      await models.Base.knex('automation_runs').insert(
        runs.map((r, j) => ({
          ...r,
          created_at: new Date(r.created_at),
          updated_at: new Date(r.updated_at),
          member_id: (start + j) % 997 === 0 ? null : id(1000000 + memberIndex(start + j)),
          member_email: 'old@historical.test',
        })),
      );
      await append(
        '_mv_automation_runs',
        runs.map((r) => ({ ...r, site_uuid: site })),
      );
      await append(
        '_mv_automation_run_steps',
        runs.flatMap((r, j) => [
          {
            site_uuid: site,
            id: `${r.id}a`,
            automation_run_id: r.id,
            status: 'finished',
            updated_at: r.updated_at,
          },
          {
            site_uuid: site,
            id: `${r.id}b`,
            automation_run_id: r.id,
            status:
              status(start + j) === 'completed'
                ? 'finished'
                : status(start + j) === 'in_progress'
                  ? 'pending'
                  : status(start + j) === 'unclassified'
                    ? 'unknown'
                    : 'failed',
            updated_at: r.updated_at,
          },
        ]),
      );
    }
    await append('_mv_automation_runs', [
      {
        site_uuid: randomUUID(),
        id: id(count + 10),
        automation_id: automationId,
        created_at: stamp(0),
        updated_at: stamp(0),
      },
    ]);
  }, 600000);
  afterAll(async () => {
    await configUtils.restore();
    mockManager.restore();
    TinybirdServiceWrapper.instance = previousTinybird;
  });
  const fields = {
    in_progress: 'in_progress_run_count',
    completed: 'completed_run_count',
    exited_early: 'exited_early_run_count',
    unclassified: 'unclassified_run_count',
  };
  const empty = () => Object.fromEntries(Object.values(fields).map((key) => [key, 0]));
  function expectedCounts(query) {
    const totals = empty();
    for (const n of expected(query, undefined, 'asc')) {
      totals[fields[status(n)]] += 1;
    }
    return totals;
  }
  async function readCounts(search, cursor) {
    const params = new URLSearchParams({ search, ...(cursor ? { cursor } : {}) });
    return (
      await agent.get(`automations/${automationId}/status-stats/?${params}`).expectStatus(200)
    ).body;
  }
  async function finish(query, initial) {
    const times = [];
    let cursor;
    let response = initial;
    for (let page = 0; page < 100; page++) {
      const start = performance.now();
      response = response ?? (await readCounts(query, cursor));
      times.push(performance.now() - start);
      cursor = response.meta.pagination.next_cursor;
      if (!cursor) {
        assert.equal(response.meta.pagination.state, 'exhausted');
        assert.equal(response.automation_status_stats.length, 1);
        const { automation_id: owner, ...counts } = response.automation_status_stats[0];
        assert.equal(owner, automationId);
        return { counts, times };
      }
      assert.equal(response.meta.pagination.state, 'scanning');
      assert.deepEqual(response.automation_status_stats, []);
      response = undefined;
    }
    assert.fail('Count traversal failed to terminate');
  }
  it('counts all runs across complete broad, narrow, empty and late-match searches using the installed schema', async () => {
    const indexes = await models.Base.knex.raw('SHOW INDEX FROM automation_runs');
    const measurements = [];
    for (const query of ['a', 'Needle', 'zzzz', 'bench.test', 'Late']) {
      const start = performance.now();
      const result = await finish(query);
      assert.deepEqual(result.counts, expectedCounts(query));
      measurements.push({
        query,
        counts: result.counts,
        requests: result.times.length,
        firstMs: result.times[0],
        totalMs: performance.now() - start,
        requestMs: result.times,
      });
    }
    process.stdout.write(
      `NY1615_BENCHMARK ${JSON.stringify({ runs: count, members: 20001, indexes: [...new Set(indexes[0].map((index) => index.Key_name))], measurements })}\n`,
    );
  }, 120000);
  it('agrees with complete list traversals, including repeat entries and sparse status filters', async () => {
    for (const query of ['Needle', 'Late']) {
      const { counts } = await finish(query);
      const all = await traverse(query, 'asc');
      assert.equal(
        Object.values(counts).reduce((a, b) => a + b, 0),
        all.length,
      );
      for (const filter of ['completed', 'exited_early', 'in_progress']) {
        assert.equal(counts[fields[filter]], (await traverse(query, 'desc', filter)).length);
      }
    }
  }, 120000);
  it('retries a token without double counting and keeps the original upper fence', async () => {
    const first = await readCounts('bench.test');
    assert.equal(first.meta.pagination.state, 'scanning');
    const cursor = first.meta.pagination.next_cursor;
    const next = await readCounts('bench.test', cursor);
    const retry = await readCounts('bench.test', cursor);
    assert.deepEqual(
      (await finish('bench.test', retry)).counts,
      (await finish('bench.test', next)).counts,
    );
    const run = {
      id: id(count + 100),
      automation_id: automationId,
      created_at: stamp(count),
      updated_at: stamp(count),
    };
    await models.Base.knex('automation_runs').insert({
      ...run,
      created_at: new Date(run.created_at),
      updated_at: new Date(run.updated_at),
      member_id: id(1000001),
      member_email: 'old@historical.test',
    });
    await append('_mv_automation_runs', [{ ...run, site_uuid: site }]);
    // No steps means unclassified. A new scan sees it; the existing scan does not.
    assert.deepEqual((await finish('bench.test', first)).counts, expectedCounts('bench.test'));
    const fresh = expectedCounts('bench.test');
    fresh.unclassified_run_count += 1;
    assert.deepEqual((await finish('bench.test')).counts, fresh);
  }, 120000);
});
