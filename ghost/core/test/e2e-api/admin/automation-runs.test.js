const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const sinon = require('sinon');
const nock = require('nock');
const ObjectId = require('bson-objectid').default;
const models = require('../../../core/server/models');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const configUtils = require('../../utils/config-utils');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../../utils/automations-fixtures');

const runId = () => ObjectId().toHexString();
const timestamp = '2026-09-14T12:00:00.123Z';

describe('Automation runs API', function () {
  let agent;
  let automationId;
  let memberIds;
  let queries;
  const captureQuery = (query) => queries.push(query.sql);

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    automationId = (await models.Base.knex('automations').first('id')).id;
    memberIds = [];
    queries = [];
    mockManager.mockLabsDisabled('automationsTinybirdSync');
    models.Base.knex.on('query', captureQuery);
  });

  afterEach(async function () {
    models.Base.knex.removeListener('query', captureQuery);
    sinon.restore();
    nock.cleanAll();
    mockManager.restore();
    await cleanupAutomationsFixture();
    await models.Base.knex('members').whereIn('id', memberIds).del();
  });

  async function readRuns(status = 200, query = '') {
    const { body } = await agent
      .get(`automations/${automationId}/runs${query}`)
      .expectStatus(status);
    return body.automation_runs;
  }

  function assertNoRunLookup() {
    assert.ok(queries.every((sql) => !/\bautomation_runs\b|\bautomation_run_steps\b/.test(sql)));
  }

  it('fails with Tinybird disabled without falling back to SQL', async function () {
    await readRuns(500);
    assertNoRunLookup();
  });

  it('returns 404 for an unknown automation', async function () {
    automationId = runId();
    await readRuns(404);
    assertNoRunLookup();
  });

  it.each([
    'unknown',
    'unclassified',
    '',
    'Completed',
    'completed,in_progress',
    'completed&status=exited_early',
  ])('rejects an unsupported status (%s)', async function (status) {
    await readRuns(422, `?status=${status}`);
    assertNoRunLookup();
  });

  it.each([
    'created_at',
    'created_at DESC',
    'created_at asc, id asc',
    'status unknown',
    'status asc',
    'status desc',
    'member.email desc',
    '',
  ])('rejects an unsupported order (%s)', async function (order) {
    await readRuns(422, `?order=${encodeURIComponent(order)}`);
    assertNoRunLookup();
  });

  it('requires permission to read automations', async function () {
    await agent.loginAsAuthor();
    try {
      await readRuns(403);
      assertNoRunLookup();
    } finally {
      await agent.loginAsOwner();
    }
  });

  describe('Tinybird', function () {
    let previousTinybirdInstance;
    let siteUuid;
    beforeEach(async function () {
      previousTinybirdInstance = TinybirdServiceWrapper.instance;
      mockManager.mockLabsEnabled('automationsTinybirdSync');
      configUtils.set('tinybird', {
        workspaceId: 'test-workspace-id',
        adminToken: 'test-admin-token',
        stats: { endpoint: 'https://api.tinybird.co', version: 'v2' },
      });
      TinybirdServiceWrapper.init();
      siteUuid = (await models.Settings.findOne({ key: 'site_uuid' })).get('value');
    });
    afterEach(async function () {
      await configUtils.restore();
      TinybirdServiceWrapper.instance = previousTinybirdInstance;
    });

    function mockRuns(status, response, { runStatus, direction = 'desc' } = {}) {
      return nock('https://api.tinybird.co')
        .get('/v0/pipes/api_automation_runs.json')
        .query({
          ghost_client: 'server',
          site_uuid: siteUuid,
          automation_id: automationId,
          ...(runStatus ? { run_status: runStatus } : {}),
          sort_direction: direction,
        })
        .reply(status, response);
    }

    async function addMember(name) {
      const member = { id: runId(), name, email: `${runId()}@example.com` };
      memberIds.push(member.id);
      await models.Base.knex('members').insert({
        ...member,
        uuid: randomUUID(),
        transient_id: runId(),
        created_at: new Date(timestamp),
      });
      return member;
    }

    async function addRun(id, member, owner = automationId) {
      await models.Base.knex('automation_runs').insert({
        id,
        automation_id: owner,
        member_id: member?.id ?? null,
        member_email: 'historical@example.com',
        created_at: new Date(timestamp),
        updated_at: new Date(timestamp),
      });
    }

    it('preserves run identity and order while hydrating current member details, including repeat entries', async function () {
      const named = await addMember('Current name');
      const unnamed = await addMember(null);
      const rows = Array.from({ length: 10 }, (_, i) => ({
        id: runId(),
        created_at: timestamp,
        status: ['in_progress', 'completed', 'exited_early', 'unclassified'][i % 4],
        failed: i === 2,
      })).sort((a, b) => b.id.localeCompare(a.id));
      for (const [i, row] of rows.entries()) {
        await addRun(row.id, i % 2 ? named : unnamed);
      }
      queries.length = 0;
      const request = mockRuns(200, { data: rows });
      assert.deepEqual(
        await readRuns(),
        rows.map((row, i) => ({ ...row, member: i % 2 ? named : unnamed })),
      );
      assert.ok(request.isDone());
      const runQueries = queries.filter((sql) => /\bautomation_runs\b/.test(sql));
      assert.equal(runQueries.length, 1);
      assert.match(runQueries[0], /`runs`\.`id` in \(/);
      assert.ok(queries.every((sql) => !/\bautomation_run_steps\b/.test(sql)));
    });

    it('keeps deleted members and missing Core runs without reusing historical email', async function () {
      const member = await addMember('Deleted');
      const deletedRun = runId();
      await addRun(deletedRun, member);
      await models.Base.knex('members').where('id', member.id).del();
      const rows = [deletedRun, runId()]
        .sort((a, b) => b.localeCompare(a))
        .map((id) => ({ id, created_at: timestamp, status: 'completed', failed: false }));
      mockRuns(200, { data: rows });
      assert.deepEqual(
        await readRuns(),
        rows.map((row) => ({ ...row, member: null })),
      );
    });

    it('does not hydrate a member from a different automation', async function () {
      const other = await models.Base.knex('automations').whereNot('id', automationId).first('id');
      const member = await addMember('Other automation');
      const id = runId();
      await addRun(id, member, other.id);
      const row = { id, created_at: timestamp, status: 'in_progress', failed: false };
      mockRuns(200, { data: [row] });
      assert.deepEqual(await readRuns(), [{ ...row, member: null }]);
    });

    it('returns an empty page without looking up members', async function () {
      const request = mockRuns(200, { data: [] });
      assert.deepEqual(await readRuns(), []);
      assert.ok(request.isDone());
      assertNoRunLookup();
    });

    it.each(['in_progress', 'completed', 'exited_early'])(
      'passes the %s filter to Tinybird and preserves run identity and member details',
      async function (status) {
        const member = await addMember('Repeat member');
        const rows = Array.from({ length: 3 }, () => ({
          id: runId(),
          created_at: timestamp,
          status,
          failed: status === 'exited_early',
        })).sort((a, b) => b.id.localeCompare(a.id));
        await addRun(rows[0].id, member);
        await addRun(rows[1].id, member);
        await addRun(rows[2].id, null);
        const request = mockRuns(200, { data: rows }, { runStatus: status });
        assert.deepEqual(
          await readRuns(200, `?status=${status}`),
          rows.map((row, i) => ({ ...row, member: i < 2 ? member : null })),
        );
        assert.ok(request.isDone());
      },
    );

    it.each([
      ['created_at asc', 'asc'],
      ['created_at desc', 'desc'],
    ])(
      'passes the %s order to Tinybird and keeps the returned order',
      async function (order, direction) {
        const member = await addMember('Sorted member');
        const ids = [runId(), runId(), runId()].sort();
        const rows = [
          { id: ids[0], created_at: '2026-09-13T12:00:00.000Z' },
          { id: ids[1], created_at: '2026-09-14T12:00:00.000Z' },
          { id: ids[2], created_at: '2026-09-14T12:00:00.000Z' },
        ].map((row) => ({ ...row, status: 'completed', failed: false }));
        if (direction === 'desc') {
          rows.reverse();
        }
        await addRun(rows[0].id, member);
        const request = mockRuns(200, { data: rows }, { direction });
        assert.deepEqual(
          await readRuns(200, `?order=${encodeURIComponent(order)}`),
          rows.map((row, i) => ({ ...row, member: i === 0 ? member : null })),
        );
        assert.ok(request.isDone());
      },
    );

    it('combines the status filter with the requested order', async function () {
      const request = mockRuns(200, { data: [] }, { runStatus: 'completed', direction: 'asc' });
      assert.deepEqual(await readRuns(200, '?status=completed&order=created_at%20asc'), []);
      assert.ok(request.isDone());
    });

    it.each([
      ['ascending rows under the default order', undefined, 'desc', ['a', 'b'], ['13', '14']],
      ['ties out of ID order under desc', 'created_at desc', 'desc', ['a', 'b'], ['14', '14']],
      ['ties out of ID order under asc', 'created_at asc', 'asc', ['b', 'a'], ['14', '14']],
      ['descending rows under asc', 'created_at asc', 'asc', ['a', 'b'], ['14', '13']],
    ])('rejects %s', async function (_, order, direction, ids, days) {
      sinon.stub(require('@tryghost/logging'), 'error');
      const rows = ids.map((id, i) => ({
        id,
        created_at: `2026-09-${days[i]}T12:00:00.000Z`,
        status: 'completed',
        failed: false,
      }));
      const request = mockRuns(200, { data: rows }, { direction });
      await readRuns(500, order ? `?order=${encodeURIComponent(order)}` : '');
      assert.ok(request.isDone());
      assertNoRunLookup();
    });

    it('rejects rows that do not match the requested status', async function () {
      sinon.stub(require('@tryghost/logging'), 'error');
      const request = mockRuns(
        200,
        { data: [{ id: runId(), created_at: timestamp, status: 'in_progress', failed: false }] },
        { runStatus: 'completed' },
      );
      await readRuns(500, '?status=completed');
      assert.ok(request.isDone());
      assertNoRunLookup();
    });

    it('distinguishes no matching runs from a failed filtered request', async function () {
      const empty = mockRuns(200, { data: [] }, { runStatus: 'completed' });
      assert.deepEqual(await readRuns(200, '?status=completed'), []);
      assert.ok(empty.isDone());
      const failed = mockRuns(503, 'Unavailable', { runStatus: 'completed' });
      await readRuns(500, '?status=completed');
      assert.ok(failed.isDone());
      assertNoRunLookup();
    });

    it.each([
      [404, 'Missing pipe'],
      [
        200,
        { data: [{ id: 'run', created_at: timestamp, status: 'exited_early', failed: 'yes' }] },
      ],
      [503, 'Unavailable'],
      [
        200,
        { data: [{ id: 'run', created_at: timestamp, status: 'future_status', failed: false }] },
      ],
      [200, { data: [{ id: 'run', created_at: 'invalid', status: 'completed', failed: false }] }],
      [200, { data: [{ created_at: timestamp, status: 'completed', failed: false }] }],
      [
        200,
        {
          data: Array.from({ length: 11 }, (_, i) => ({
            id: String(i),
            created_at: timestamp,
            status: 'completed',
            failed: false,
          })),
        },
      ],
      [
        200,
        {
          data: Array.from({ length: 2 }, () => ({
            id: 'duplicate',
            created_at: timestamp,
            status: 'completed',
            failed: false,
          })),
        },
      ],
    ])('fails for an unavailable pipe or invalid response (%s, %j)', async function (status, body) {
      sinon.stub(require('@tryghost/logging'), 'error');
      const request = mockRuns(status, body);
      await readRuns(500);
      assert.ok(request.isDone());
      assertNoRunLookup();
    });

    it.each(['in_progress', 'completed', 'unclassified'])(
      'rejects a failure flag on a %s run',
      async function (status) {
        sinon.stub(require('@tryghost/logging'), 'error');
        const request = mockRuns(200, {
          data: [{ id: runId(), created_at: timestamp, status, failed: true }],
        });
        await readRuns(500);
        assert.ok(request.isDone());
        assertNoRunLookup();
      },
    );

    it('fails without a Tinybird token', async function () {
      sinon.stub(TinybirdServiceWrapper.instance, 'getToken').returns(null);
      await readRuns(500);
      assertNoRunLookup();
    });

    it('surfaces a failed member lookup instead of reporting deleted members', async function () {
      sinon.stub(require('@tryghost/logging'), 'error');
      const client = models.Base.knex.client;
      const originalQuery = client.query;
      sinon.stub(client, 'query').callsFake(function (connection, query, ...rest) {
        if (/from `automation_runs`/.test(query.sql)) {
          return Promise.reject(new Error('Member lookup unavailable'));
        }
        return originalQuery.call(this, connection, query, ...rest);
      });
      const request = mockRuns(200, {
        data: [{ id: runId(), created_at: timestamp, status: 'completed', failed: false }],
      });
      await readRuns(500);
      assert.ok(request.isDone());
    });
  });
});
