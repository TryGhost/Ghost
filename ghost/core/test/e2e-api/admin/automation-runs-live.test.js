const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { setupAutomationsFixture } = require('../../utils/automations-fixtures');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');

// Opt-in: requires a built, disposable Tinybird Local workspace. See the service README.
const configFile = process.env.AUTOMATION_TINYBIRD_TEST_CONFIG;
describe.skipIf(!configFile)('Automation run pagination with live Tinybird', function () {
  let agent;
  let local;
  let automationId;
  let siteUuid;
  let previousTinybird;
  const time = '2026-01-01T00:00:00.000Z';
  const version = '2026-01-02T00:00:00.000Z';

  async function append(name, rows) {
    const response = await fetch(`${local.endpoint}/v0/events?name=${name}&wait=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${local.token}`, 'Content-Type': 'application/x-ndjson' },
      body: rows
        .map((row) =>
          JSON.stringify({
            site_uuid: siteUuid,
            id: row.id,
            updated_at: row.updated_at,
            payload: JSON.stringify(row),
          }),
        )
        .join('\n'),
    });
    assert.equal(response.status, 200, await response.text());
  }
  const runId = (i) => `${automationId.slice(0, 18)}${String(i).padStart(6, '0')}`;
  const step = (i, status, updated_at = version) => ({
    id: `step-${runId(i)}`,
    automation_run_id: runId(i),
    status,
    updated_at,
  });
  async function seed(count, status = 'finished') {
    await append(
      'automation_run_events',
      Array.from({ length: count }, (_, i) => ({
        id: runId(i),
        automation_id: automationId,
        created_at: time,
        updated_at: time,
      })),
    );
    await append(
      'automation_run_step_events',
      Array.from({ length: count }, (_, i) => step(i, status)),
    );
  }
  async function read(order, cursor, status) {
    const query = new URLSearchParams({
      order,
      ...(cursor ? { cursor } : {}),
      ...(status ? { status } : {}),
    });
    const response = await agent
      .get(`automations/${automationId}/runs/?${query}`)
      .expectStatus(200);
    return response.body;
  }
  async function rest(order, cursor, status) {
    const rows = [];
    for (let page = 0; cursor && page < 10; page++) {
      const result = await read(order, cursor, status);
      rows.push(...result.automation_runs);
      cursor = result.meta.pagination.next_cursor;
    }
    assert.equal(cursor, null, 'Pagination should reach the end');
    return rows;
  }

  beforeAll(async function () {
    local = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const target = new URL(local.endpoint);
    assert.equal(target.hostname, '127.0.0.1');
    assert.equal(target.protocol, 'http:');
    assert.notEqual(target.port, '7181', 'Never write to shared Tinybird');
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
    previousTinybird = TinybirdServiceWrapper.instance;
  });
  beforeEach(async function () {
    await setupAutomationsFixture();
    automationId = (await models.Base.knex('automations').first('id')).id;
    // Each case owns a new site namespace; only append, never truncate shared tables.
    siteUuid = randomUUID();
    configUtils.set('tinybird', { stats: { id: siteUuid, local: { enabled: true, ...local } } });
    TinybirdServiceWrapper.init();
    mockManager.mockLabsEnabled('automationsTinybirdSync');
  });
  afterEach(async function () {
    await configUtils.restore();
    mockManager.restore();
    TinybirdServiceWrapper.instance = previousTinybird;
  });

  it.each(['asc', 'desc'])(
    'handles inserted runs and changed filter membership after an entry-sorted %s page',
    async function (direction) {
      await seed(65);
      const beforeCursor = direction === 'asc' ? 0 : 64;
      const newlyMatching = direction === 'asc' ? 63 : 1;
      const noLongerMatching = direction === 'asc' ? 64 : 0;
      await append('automation_run_step_events', [
        step(newlyMatching, 'pending', '2026-01-03T00:00:00.000Z'),
      ]);
      const first = await read(`created_at ${direction}`, null, 'completed');
      assert.equal(first.automation_runs.length, 50);
      await append('automation_run_step_events', [
        step(beforeCursor, 'pending', '2026-01-04T00:00:00.000Z'),
        step(newlyMatching, 'finished', '2026-01-04T00:00:00.000Z'),
        step(noLongerMatching, 'pending', '2026-01-04T00:00:00.000Z'),
      ]);
      await append('automation_run_events', [
        { id: runId(99), automation_id: automationId, created_at: version, updated_at: version },
      ]);
      await append('automation_run_step_events', [step(99, 'finished')]);
      const ids = (
        await rest(`created_at ${direction}`, first.meta.pagination.next_cursor, 'completed')
      ).map((row) => row.id);
      assert.ok(ids.includes(runId(newlyMatching)));
      assert.ok(!ids.includes(runId(noLongerMatching)));
      assert.ok(!ids.includes(runId(beforeCursor)));
      assert.equal(ids.includes(runId(99)), direction === 'asc');
      assert.equal(
        new Set([...first.automation_runs.map((row) => row.id), ...ids]).size,
        first.automation_runs.length + ids.length,
      );
    },
    60_000,
  );
});
