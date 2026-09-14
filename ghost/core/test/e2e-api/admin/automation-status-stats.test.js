const assert = require('node:assert/strict');
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

const zeroCounts = {
  in_progress_run_count: 0,
  completed_run_count: 0,
  exited_early_run_count: 0,
  unclassified_run_count: 0,
};

describe('Automation status stats API', function () {
  let agent;
  let automationId;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    automationId = (await models.Base.knex('automations').first('id')).id;
    mockManager.mockLabsDisabled('automationsTinybirdSync');
  });

  afterEach(async function () {
    sinon.restore();
    nock.cleanAll();
    mockManager.restore();
    await cleanupAutomationsFixture();
  });

  async function readCounts(expected = 200) {
    const { body } = await agent
      .get(`automations/${automationId}/status-stats`)
      .expectStatus(expected);
    return body.automation_status_stats?.[0];
  }

  it('fails with the flag disabled without querying SQL statistics', async function () {
    const queries = [];
    const capture = (query) => queries.push(query.sql);
    models.Base.knex.on('query', capture);
    try {
      await agent.get(`automations/${automationId}/status-stats`).expectStatus(500);
    } finally {
      models.Base.knex.removeListener('query', capture);
    }
    assert.ok(
      queries.every(
        (sql) =>
          !/\bautomation_runs\b|\bautomation_run_steps\b|\bautomation_actions\b|\bautomation_action_revisions\b/.test(
            sql,
          ),
      ),
    );
  });

  it('returns 404 for unknown automations', async function () {
    await agent.get(`automations/${ObjectId().toHexString()}/status-stats`).expectStatus(404);
  });

  it('requires permission to read automations', async function () {
    await agent.loginAsAuthor();
    try {
      await readCounts(403);
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

    it('returns 500 when the automation existence lookup fails', async function () {
      sinon.stub(require('@tryghost/logging'), 'error');
      const client = models.Base.knex.client;
      const originalQuery = client.query;
      let lookupFailures = 0;
      sinon.stub(client, 'query').callsFake(function (connection, query, ...rest) {
        if (/from `automations`/.test(query.sql)) {
          lookupFailures += 1;
          return Promise.reject(new Error('Automation lookup unavailable'));
        }
        return originalQuery.call(this, connection, query, ...rest);
      });
      const requests = mockStats(200, { data: [] });
      await agent.get(`automations/${automationId}/status-stats`).expectStatus(500);
      assert.equal(lookupFailures, 1);
      assert.equal(requests.isDone(), false);
    });

    function mockStats(status, response) {
      return nock('https://api.tinybird.co')
        .get('/v0/pipes/api_automation_status_stats.json')
        .query({ ghost_client: 'server', site_uuid: siteUuid, automation_id: automationId })
        .reply(status, response);
    }

    async function readWithoutSqlStats(status = 200) {
      const queries = [];
      const capture = (query) => queries.push(query.sql);
      models.Base.knex.on('query', capture);
      try {
        return await readCounts(status);
      } finally {
        models.Base.knex.removeListener('query', capture);
        assert.ok(
          queries.every(
            (sql) =>
              !/\bautomation_runs\b|\bautomation_run_steps\b|\bautomation_actions\b|\bautomation_action_revisions\b/.test(
                sql,
              ),
          ),
        );
      }
    }

    it('uses single-automation Tinybird counts without SQL aggregation', async function () {
      const requests = mockStats(200, {
        data: [
          {
            in_progress_run_count: '7',
            completed_run_count: '12',
            exited_early_run_count: '3',
            unclassified_run_count: '1',
          },
        ],
      });
      assert.deepEqual(await readWithoutSqlStats(), {
        automation_id: automationId,
        in_progress_run_count: 7,
        completed_run_count: 12,
        exited_early_run_count: 3,
        unclassified_run_count: 1,
      });
      assert.ok(requests.isDone());
    });

    it('preserves successful zero counts', async function () {
      const requests = mockStats(200, { data: [zeroCounts] });
      assert.deepEqual(await readWithoutSqlStats(), { automation_id: automationId, ...zeroCounts });
      assert.ok(requests.isDone());
    });

    it.each([
      [404, 'Missing pipe'],
      [503, 'Unavailable'],
      [200, { data: [] }],
      [200, { data: [{ in_progress_run_count: 1 }] }],
      [200, { data: [{ ...zeroCounts, completed_run_count: -1 }] }],
    ])(
      'fails without SQL fallback for unavailable or invalid stats (%s)',
      async function (status, response) {
        sinon.stub(require('@tryghost/logging'), 'error');
        const requests = mockStats(status, response);
        await readWithoutSqlStats(500);
        assert.ok(requests.isDone());
      },
    );

    it('fails without SQL fallback when the token is unavailable', async function () {
      sinon.stub(TinybirdServiceWrapper.instance, 'getToken').returns(null);
      await readWithoutSqlStats(500);
    });
  });
});
