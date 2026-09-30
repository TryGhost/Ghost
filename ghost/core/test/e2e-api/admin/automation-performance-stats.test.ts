import assert from 'node:assert/strict';
import sinon from 'sinon';
import nock from 'nock';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
const models = require('../../../core/server/models');
const TinybirdServiceWrapper = require('../../../core/server/services/tinybird');
const configUtils = require('../../utils/config-utils');
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
import {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} from '../../utils/automations-fixtures';

describe('Automation performance stats API', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let automationId: string;
  let clock: sinon.SinonFakeTimers;
  const zeroRow = (date = '2026-09-14') => ({
    date,
    in_progress_run_count: 0,
    completed_run_count: 0,
    exited_early_run_count: 0,
    invalid_run_count: 0,
  });

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

  async function requestStats(status: number, queryString = '') {
    const queries: string[] = [];
    const capture = (query: { sql: string }) => queries.push(query.sql);
    models.Base.knex.on('query', capture);
    try {
      return await agent
        .get(`automations/${automationId}/performance-stats${queryString}`)
        .expectStatus(status);
    } finally {
      models.Base.knex.removeListener('query', capture);
      assert.ok(
        queries.every(
          (sql) => !/\bautomation_runs\b|\bautomation_run_steps\b|\bautomation_actions\b/.test(sql),
        ),
      );
    }
  }

  it('fails with the flag disabled without querying SQL statistics', async function () {
    await requestStats(500);
  });

  it('returns 404 for an unknown automation even with Tinybird disabled', async function () {
    await agent.get(`automations/${ObjectId().toHexString()}/performance-stats`).expectStatus(404);
  });

  it('requires permission to read automations', async function () {
    await agent.loginAsAuthor();
    try {
      await agent.get(`automations/${automationId}/performance-stats`).expectStatus(403);
    } finally {
      await agent.loginAsOwner();
    }
  });

  describe('Tinybird', function () {
    let previousTinybirdInstance: typeof TinybirdServiceWrapper.instance;
    let siteUuid: string;
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
      const client: Knex.Client = models.Base.knex.client;
      const originalQuery = client.query;
      let lookupFailures = 0;
      sinon.stub(client, 'query').callsFake(function (
        this: typeof client,
        connection: unknown,
        query: { sql: string },
      ) {
        if (/from `automations`/.test(query.sql)) {
          lookupFailures += 1;
          return Promise.reject(new Error('Automation lookup unavailable'));
        }
        return originalQuery.call(this, connection, query);
      });
      const requests = mockStats(200, { data: [zeroRow()] });
      await agent.get(`automations/${automationId}/performance-stats`).expectStatus(500);
      assert.equal(lookupFailures, 1);
      assert.equal(requests.isDone(), false);
    });

    function mockStats(
      status: number,
      response: string | Record<string, unknown>,
      params: Record<string, string> = {},
    ) {
      return nock('https://api.tinybird.co')
        .get('/v0/pipes/api_automation_performance_stats.json')
        .query({
          ghost_client: 'server',
          site_uuid: siteUuid,
          automation_id: automationId,
          timezone: 'UTC',
          ...params,
        })
        .reply(status, response);
    }

    it.each(['owner', 'admin'])('allows a %s staff JWT to read statistics', async function (role) {
      const requests = mockStats(200, { data: [zeroRow()] });
      await agent.useStaffTokenFor(role);
      try {
        await agent.get(`automations/${automationId}/performance-stats`).expectStatus(200);
        assert.ok(requests.isDone());
      } finally {
        await agent.loginAsOwner();
      }
    });

    it('passes the normalized timezone to Tinybird and uses it for the response window', async function () {
      clock.setSystemTime(new Date('2026-09-14T01:00:00Z'));
      const requests = mockStats(
        200,
        { data: [zeroRow('2026-09-13')] },
        { timezone: 'America/New_York' },
      );
      const { body } = await agent
        .get(`automations/${automationId}/performance-stats/?timezone=america%2Fnew_york`)
        .expectStatus(200);
      assert.ok(requests.isDone());
      assert.deepEqual(body.automation_performance_stats[0].entry_window, {
        date_from: '2026-09-13',
        date_to: '2026-09-14',
        bucket: 'day',
        timezone: 'America/New_York',
      });
    });

    it('rejects an invalid timezone before querying Tinybird', async function () {
      const requests = mockStats(200, { data: [zeroRow()] });
      await agent
        .get(`automations/${automationId}/performance-stats/?timezone=invalid`)
        .expectStatus(422);
      assert.equal(requests.isDone(), false);
    });

    it('returns the full history and matching total from one Tinybird query', async function () {
      const start = Date.parse('2020-01-01');
      const dayMs = 24 * 60 * 60 * 1000;
      const days = (Date.parse('2026-09-14') - start) / dayMs + 1;
      const rows = Array.from({ length: days }, (_, day) =>
        zeroRow(new Date(start + day * dayMs).toISOString().slice(0, 10)),
      );
      rows[0].completed_run_count = 1;
      rows[rows.length - 1].in_progress_run_count = 1;
      rows[rows.length - 1].exited_early_run_count = 1;
      const requests = mockStats(200, { data: rows });
      const { body } = await requestStats(200);
      assert.ok(requests.isDone());
      const stats = body.automation_performance_stats[0];
      assert.equal(stats.automation_id, automationId);
      assert.deepEqual(stats.entry_window, {
        date_from: '2020-01-01',
        date_to: '2026-09-15',
        bucket: 'day',
        timezone: 'UTC',
      });
      assert.equal(stats.entries.length, rows.length);
      assert.equal(stats.total_run_count, 3);
      assert.equal(stats.in_progress_run_count, 1);
      assert.equal(stats.completed_run_count, 1);
      assert.equal(stats.exited_early_run_count, 1);
      assert.equal(stats.unclassified_run_count, undefined);
      assert.equal(
        stats.entries.reduce((sum: number, day: { count: number }) => sum + day.count, 0),
        stats.total_run_count,
      );
      assert.deepEqual(stats.entries[0], { date: '2020-01-01', count: 1 });
      assert.deepEqual(stats.entries.at(-1), { date: '2026-09-14', count: 2 });
    });

    it('forwards exclusive bounds and timezone to the shared chart and status query', async function () {
      const requests = mockStats(
        200,
        {
          data: [
            zeroRow('2024-03-09'),
            {
              date: '2024-03-10',
              in_progress_run_count: 1,
              completed_run_count: 2,
              exited_early_run_count: 3,
              invalid_run_count: 0,
            },
          ],
        },
        {
          date_from: '2024-03-09',
          date_to: '2024-03-11',
          timezone: 'America/New_York',
        },
      );
      const { body } = await requestStats(
        200,
        '?date_from=2024-03-09&date_to=2024-03-10&timezone=America%2FNew_York',
      );
      assert.ok(requests.isDone());
      assert.deepEqual(body.automation_performance_stats[0], {
        automation_id: automationId,
        entry_window: {
          date_from: '2024-03-09',
          date_to: '2024-03-11',
          timezone: 'America/New_York',
          bucket: 'day',
        },
        entries: [
          { date: '2024-03-09', count: 0 },
          { date: '2024-03-10', count: 6 },
        ],
        total_run_count: 6,
        in_progress_run_count: 1,
        completed_run_count: 2,
        exited_early_run_count: 3,
      });
    });

    it('preserves Tinybird’s zero-filled selected range', async function () {
      const requests = mockStats(
        200,
        { data: ['2024-02-28', '2024-02-29', '2024-03-01'].map(zeroRow) },
        { date_from: '2024-02-28', date_to: '2024-03-02' },
      );
      const { body } = await requestStats(200, '?date_from=2024-02-28&date_to=2024-03-01');
      assert.ok(requests.isDone());
      assert.deepEqual(body.automation_performance_stats[0].entries, [
        { date: '2024-02-28', count: 0 },
        { date: '2024-02-29', count: 0 },
        { date: '2024-03-01', count: 0 },
      ]);
    });

    it('returns hourly buckets within the requested local calendar day', async function () {
      const rows = [
        zeroRow('2024-11-03T05:00:00Z'),
        zeroRow('2024-11-03T06:00:00Z'),
        zeroRow('2024-11-04T04:00:00Z'),
      ];
      rows[0].completed_run_count = 1;
      const requests = mockStats(
        200,
        { data: rows },
        {
          date_from: '2024-11-03',
          date_to: '2024-11-04',
          timezone: 'America/New_York',
        },
      );
      const { body } = await requestStats(
        200,
        '?date_from=2024-11-03&date_to=2024-11-03&timezone=America%2FNew_York',
      );
      assert.ok(requests.isDone());
      const stats = body.automation_performance_stats[0];
      assert.equal(stats.entry_window.bucket, 'hour');
      assert.equal(stats.total_run_count, 1);
      assert.deepEqual(
        stats.entries.map((entry: { date: string }) => entry.date),
        rows.map((row) => row.date),
      );
    });

    it('defaults an omitted end to today in the requested timezone', async function () {
      clock.setSystemTime(new Date('2026-09-14T01:00:00Z'));
      const requests = mockStats(
        200,
        { data: [zeroRow('2026-09-13')] },
        {
          date_from: '2026-09-13',
          date_to: '2026-09-14',
          timezone: 'America/New_York',
        },
      );
      const { body } = await requestStats(200, '?date_from=2026-09-13&timezone=America%2FNew_York');
      assert.ok(requests.isDone());
      assert.deepEqual(body.automation_performance_stats[0].entry_window, {
        date_from: '2026-09-13',
        date_to: '2026-09-14',
        bucket: 'day',
        timezone: 'America/New_York',
      });
    });

    it('rejects a future date before querying Tinybird', async function () {
      const requests = mockStats(200, { data: [] });
      await requestStats(422, '?date_from=2026-09-14&date_to=2026-09-15');
      assert.equal(requests.isDone(), false);
    });

    // The parser unit tests cover the validation matrix; this checks the HTTP boundary.
    it('returns 422 for an end date without a start date without fetching Tinybird', async function () {
      const requests = mockStats(200, { data: [] });
      await requestStats(422, '?date_to=2024-01-01');
      assert.equal(requests.isDone(), false);
    });

    it.each(['2024-03-09', '2024-03-11'])(
      'rejects a bucket outside the requested range (%s)',
      async function (date) {
        const requests = mockStats(
          200,
          {
            data: [
              {
                date,
                in_progress_run_count: 0,
                completed_run_count: 1,
                exited_early_run_count: 0,
                invalid_run_count: 0,
              },
            ],
          },
          { date_from: '2024-03-10', date_to: '2024-03-11' },
        );
        await requestStats(500, '?date_from=2024-03-10&date_to=2024-03-10');
        assert.ok(requests.isDone());
      },
    );

    // Detailed invalid-value cases belong to fetchAutomationPerformanceStats unit tests.
    it.each([
      { reason: 'missing pipe', status: 404, response: 'Missing pipe' },
      { reason: 'service unavailable', status: 503, response: 'Unavailable' },
      { reason: 'malformed data', status: 200, response: { data: [{ date: 'invalid' }] } },
    ])('returns 500 without SQL fallback for $reason', async function ({ status, response }) {
      sinon.stub(require('@tryghost/logging'), 'error');
      const requests = mockStats(status, response);
      await requestStats(500);
      assert.ok(requests.isDone());
    });

    it('fails when Tinybird configuration is missing', async function () {
      configUtils.set('tinybird:stats', null);
      await requestStats(500);
    });

    it('fails when the Tinybird token is unavailable', async function () {
      sinon.stub(TinybirdServiceWrapper.instance, 'getToken').returns(null);
      await requestStats(500);
    });

    it('preserves Tinybird’s zero bucket for an empty history', async function () {
      const requests = mockStats(200, { data: [zeroRow()] });
      const { body } = await requestStats(200);
      assert.ok(requests.isDone());
      assert.equal(body.automation_performance_stats[0].total_run_count, 0);
      assert.equal(body.automation_performance_stats[0].in_progress_run_count, 0);
      assert.equal(body.automation_performance_stats[0].completed_run_count, 0);
      assert.equal(body.automation_performance_stats[0].exited_early_run_count, 0);
      assert.deepEqual(body.automation_performance_stats[0].entries, [
        { date: '2026-09-14', count: 0 },
      ]);
    });
  });
});
