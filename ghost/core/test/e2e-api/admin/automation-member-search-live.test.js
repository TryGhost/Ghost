const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { setupAutomationsFixture } = require('../../utils/automations-fixtures');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const configFile = process.env.AUTOMATION_TINYBIRD_TEST_CONFIG;
const benchmark = process.env.AUTOMATION_SEARCH_BENCHMARK === '1';
const count = benchmark ? 200000 : 25000;
const id = (n) => n.toString(16).padStart(24, '0');
const stamp = (n) => new Date(Date.UTC(2026, 0, 1) + Math.floor(n / 10) * 1000).toISOString();
const status = (n) =>
  n % 1000 === 0 ? 'exited_early' : n % 10 === 2 ? 'completed' : 'in_progress';

describe.skipIf(!configFile)('Member search with real Core, MySQL and Tinybird', () => {
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
    for (let start = 0; start < count; start += 2000) {
      if (benchmark && start % 20000 === 0) {
        process.stdout.write(`NY1614_SEED ${start}/${count}\n`);
      }
      const runs = Array.from({ length: Math.min(2000, count - start) }, (_, j) => {
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
  it.each(['asc', 'desc'])(
    'traverses sparse status-filtered matches in %s order',
    async (direction) => {
      const ids = await traverse('a', direction, 'exited_early');
      assert.deepEqual(
        ids,
        expected('a', 'exited_early', direction).map((n) => id(n + 1)),
      );
    },
    60000,
  );
  it('continues empty candidate windows and returns all late matches beyond the small-set threshold', async () => {
    const first = await read('Late');
    assert.deepEqual(first.automation_runs, []);
    assert.equal(first.meta.pagination.state, 'scanning');
    assert.ok(first.meta.pagination.next_cursor);
    const ids = await traverse('Late', 'asc');
    assert.deepEqual(
      ids,
      expected('Late', undefined, 'asc').map((n) => id(n + 1)),
    );
  }, 60000);
  it('handles narrow and no-match searches against the real pipe', async () => {
    assert.deepEqual(
      await traverse('Needle', 'desc'),
      expected('Needle', undefined, 'desc').map((n) => id(n + 1)),
    );
    assert.deepEqual(await traverse('zzzz', 'asc'), []);
  });
  it.each(['asc', 'desc'])('does not skip a broad page suffix in %s order', async (direction) => {
    const first = await read('a', direction);
    const second = await read('a', direction, undefined, first.meta.pagination.next_cursor);
    assert.deepEqual(
      [...first.automation_runs, ...second.automation_runs].map((item) => item.id),
      expected('a', undefined, direction)
        .slice(0, 100)
        .map((n) => id(n + 1)),
    );
  });
  it.skipIf(!benchmark)(
    'records representative first/later page timings with exact expected IDs',
    async () => {
      const measurements = [];
      for (const query of ['a', 'Needle', 'zzzz', 'bench.test']) {
        for (const direction of ['asc', 'desc']) {
          for (const filter of [undefined, 'exited_early']) {
            const times = [];
            let result;
            for (let trial = 0; trial < 3; trial++) {
              const start = performance.now();
              result = await read(query, direction, filter);
              times.push(performance.now() - start);
            }
            const wanted = expected(query, filter, direction);
            assert.deepEqual(
              result.automation_runs.map((item) => item.id),
              wanted.slice(0, 50).map((n) => id(n + 1)),
            );
            let laterMs = null;
            if (result.meta.pagination.next_cursor) {
              const start = performance.now();
              const later = await read(
                query,
                direction,
                filter,
                result.meta.pagination.next_cursor,
              );
              laterMs = performance.now() - start;
              assert.deepEqual(
                later.automation_runs.map((item) => item.id),
                wanted.slice(50, 100).map((n) => id(n + 1)),
              );
            }
            measurements.push({
              query,
              direction,
              filter: filter ?? 'all',
              firstMs: times.sort((a, b) => a - b)[1],
              laterMs,
              rows: result.automation_runs.length,
              state: result.meta.pagination.state,
            });
          }
        }
      }
      process.stdout.write(
        `NY1614_BENCHMARK ${JSON.stringify({ runs: count, members: 20001, measurements })}\n`,
      );
    },
    120000,
  );
  it('re-evaluates member edits, deletions and status changes after a live page', async () => {
    const first = await read('a', 'asc', 'completed');
    const lastNumber = parseInt(first.automation_runs.at(-1).id, 16) - 1;
    const removed = lastNumber + 10;
    const added = lastNumber + 11;
    const deleted = lastNumber + 20;
    await models.Base.knex('members')
      .where('id', id(1000000 + memberIndex(removed)))
      .update({ name: 'Bert' });
    await models.Base.knex('members')
      .where('id', id(1000000 + memberIndex(added)))
      .update({ name: 'Anna' });
    await models.Base.knex('automation_runs')
      .where('id', id(deleted + 1))
      .update({ member_id: null });
    await append('_mv_automation_run_steps', [
      {
        site_uuid: site,
        id: `${id(added + 1)}b`,
        automation_run_id: id(added + 1),
        status: 'finished',
        updated_at: '2026-09-16T00:00:00.000Z',
      },
    ]);
    const next = await read('a', 'asc', 'completed', first.meta.pagination.next_cursor);
    const ids = next.automation_runs.map((item) => item.id);
    assert.ok(ids.includes(id(added + 1)));
    assert.ok(!ids.includes(id(removed + 1)));
    assert.ok(!ids.includes(id(deleted + 1)));
    assert.ok(ids.every((value) => value > first.automation_runs.at(-1).id));
  });
});
