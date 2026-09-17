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

describe('Automation entry stats API', function () {
  let agent;
  let automationId;
  let clock;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    automationId = (await models.Base.knex('automations').first('id')).id;
    clock = sinon.useFakeTimers({ now: new Date('2026-09-14T12:00:00Z'), toFake: ['Date'] });
    mockManager.mockLabsDisabled('automationsTinybirdSync');
  });

  afterEach(async function () {
    clock.restore();
    sinon.restore();
    nock.cleanAll();
    mockManager.restore();
    await cleanupAutomationsFixture();
  });

  it('fails with the flag disabled without querying SQL statistics', async function () {
    const queries = [];
    const capture = (query) => queries.push(query.sql);
    models.Base.knex.on('query', capture);
    try {
      await agent.get(`automations/${automationId}/entry-stats`).expectStatus(500);
    } finally {
      models.Base.knex.removeListener('query', capture);
    }
    assert.ok(queries.every((sql) => !/\bautomation_runs\b|\bautomation_run_steps\b/.test(sql)));
  });

  it('returns 404 for an unknown automation even with Tinybird disabled', async function () {
    await agent.get(`automations/${ObjectId().toHexString()}/entry-stats`).expectStatus(404);
  });

  it('requires permission to read automations', async function () {
    await agent.loginAsAuthor();
    try {
      await agent.get(`automations/${automationId}/entry-stats`).expectStatus(403);
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
      await agent.get(`automations/${automationId}/entry-stats`).expectStatus(500);
      assert.equal(lookupFailures, 1);
      assert.equal(requests.isDone(), false);
    });

    function mockStats(status, response, options = {}) {
      return nock('https://api.tinybird.co')
        .get('/v0/pipes/api_automation_entry_stats.json')
        .query({
          ghost_client: 'server',
          site_uuid: siteUuid,
          automation_id: automationId,
          timezone: 'UTC',
          ...options,
        })
        .reply(status, response);
    }

    it('returns the full history and matching total from one Tinybird query', async function () {
      const requests = mockStats(200, {
        data: [
          { date: '2026-09-14', count: '2' },
          { date: '2020-01-01', count: 1 },
        ],
      });
      const queries = [];
      const capture = (query) => queries.push(query.sql);
      models.Base.knex.on('query', capture);
      let body;
      try {
        ({ body } = await agent.get(`automations/${automationId}/entry-stats`).expectStatus(200));
      } finally {
        models.Base.knex.removeListener('query', capture);
      }
      assert.ok(requests.isDone());
      assert.ok(
        queries.every((sql) => !/automation_runs|automation_run_steps|automation_action/.test(sql)),
      );
      const stats = body.automation_entry_stats[0];
      assert.equal(stats.automation_id, automationId);
      assert.deepEqual(stats.window, {
        date_from: '2020-01-01',
        date_to: '2026-09-15',
        bucket: 'day',
        timezone: 'UTC',
      });
      assert.ok(stats.entries.length > 1000);
      assert.equal(stats.total_run_count, 3);
      assert.equal(
        stats.entries.reduce((sum, day) => sum + day.count, 0),
        stats.total_run_count,
      );
      assert.deepEqual(stats.entries[0], { date: '2020-01-01', count: 1 });
      assert.deepEqual(stats.entries.at(-1), { date: '2026-09-14', count: 2 });
    });

    it('applies the selected calendar range to both total and series', async function () {
      const request = mockStats(
        200,
        { data: [{ date: '2024-02-29', count: '2' }] },
        {
          date_from: '2024-02-28',
          date_to: '2024-03-02',
          timezone: 'America/New_York',
        },
      );
      const { body } = await agent
        .get(
          `automations/${automationId}/entry-stats/?date_from=2024-02-28&date_to=2024-03-01&timezone=America%2FNew_York`,
        )
        .expectStatus(200);
      assert.ok(request.isDone());
      assert.deepEqual(body.automation_entry_stats[0], {
        automation_id: automationId,
        total_run_count: 2,
        entries: [
          { date: '2024-02-28', count: 0 },
          { date: '2024-02-29', count: 2 },
          { date: '2024-03-01', count: 0 },
        ],
        window: {
          date_from: '2024-02-28',
          date_to: '2024-03-02',
          bucket: 'day',
          timezone: 'America/New_York',
        },
      });
    });

    it('returns zero buckets for every day in an empty selected range', async function () {
      const request = mockStats(
        200,
        { data: [] },
        { date_from: '2024-03-10', date_to: '2024-03-12' },
      );
      const { body } = await agent
        .get(`automations/${automationId}/entry-stats/?date_from=2024-03-10&date_to=2024-03-11`)
        .expectStatus(200);
      assert.ok(request.isDone());
      assert.equal(body.automation_entry_stats[0].total_run_count, 0);
      assert.deepEqual(body.automation_entry_stats[0].entries, [
        { date: '2024-03-10', count: 0 },
        { date: '2024-03-11', count: 0 },
      ]);
    });

    it('keeps all-time requests unbounded while using the requested timezone for today', async function () {
      const request = mockStats(200, { data: [] }, { timezone: 'Pacific/Auckland' });
      const { body } = await agent
        .get(`automations/${automationId}/entry-stats/?timezone=Pacific%2FAuckland`)
        .expectStatus(200);
      assert.ok(request.isDone());
      assert.deepEqual(body.automation_entry_stats[0].entries, [{ date: '2026-09-15', count: 0 }]);
    });

    it('surfaces a failed filtered query as an error rather than an empty range', async function () {
      sinon.stub(require('@tryghost/logging'), 'error');
      const request = mockStats(503, 'Unavailable', {
        date_from: '2024-03-10',
        date_to: '2024-03-11',
      });
      const { body } = await agent
        .get(`automations/${automationId}/entry-stats/?date_from=2024-03-10&date_to=2024-03-10`)
        .expectStatus(500);
      assert.ok(request.isDone());
      assert.equal(body.automation_entry_stats, undefined);
    });

    it('rejects entries outside the requested range instead of returning an inconsistent total', async function () {
      const request = mockStats(
        200,
        { data: [{ date: '2024-03-12', count: 1 }] },
        { date_from: '2024-03-10', date_to: '2024-03-11' },
      );
      await agent
        .get(`automations/${automationId}/entry-stats/?date_from=2024-03-10&date_to=2024-03-10`)
        .expectStatus(500);
      assert.ok(request.isDone());
    });

    it('returns validation errors before fetching Tinybird for invalid ranges or timezones', async function () {
      const request = mockStats(200, { data: [] });
      for (const query of [
        'date_from=2024-01-01',
        'date_from=2024-03-02&date_to=2024-03-01',
        'date_from=2024-02-30&date_to=2024-03-01',
        'timezone=invalid',
      ]) {
        await agent.get(`automations/${automationId}/entry-stats/?${query}`).expectStatus(422);
      }
      assert.equal(request.isDone(), false);
    });

    async function expectTinybirdFailure() {
      const queries = [];
      const capture = (query) => queries.push(query.sql);
      models.Base.knex.on('query', capture);
      try {
        await agent.get(`automations/${automationId}/entry-stats`).expectStatus(500);
      } finally {
        models.Base.knex.removeListener('query', capture);
      }
      assert.ok(
        queries.every((sql) => !/automation_runs|automation_run_steps|automation_action/.test(sql)),
      );
    }

    it.each([
      [404, 'Missing pipe'],
      [503, 'Unavailable'],
      [200, { data: [{ date: 'invalid', count: 1 }] }],
    ])('fails for missing, failed, or invalid series (%s)', async function (status, response) {
      sinon.stub(require('@tryghost/logging'), 'error');
      const requests = mockStats(status, response);
      await expectTinybirdFailure();
      assert.ok(requests.isDone());
    });

    it('fails when Tinybird configuration is missing', async function () {
      configUtils.set('tinybird:stats', null);
      await expectTinybirdFailure();
    });

    it('fails when the Tinybird token is unavailable', async function () {
      sinon.stub(TinybirdServiceWrapper.instance, 'getToken').returns(null);
      await expectTinybirdFailure();
    });

    it('preserves a successful empty Tinybird response', async function () {
      const requests = mockStats(200, { data: [] });
      const { body } = await agent.get(`automations/${automationId}/entry-stats`).expectStatus(200);
      assert.ok(requests.isDone());
      assert.equal(body.automation_entry_stats[0].total_run_count, 0);
      assert.deepEqual(body.automation_entry_stats[0].entries, [{ date: '2026-09-14', count: 0 }]);
    });
  });
});
