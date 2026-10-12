import assert from 'node:assert/strict';
import nock from 'nock';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';

const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const { AdminAPITestAgent } = require('../utils/agents');
const {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} = require('../utils/automations-fixtures');
const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const tinybird = require('../../core/server/services/tinybird');
const stats = require('../../core/server/services/stats');
const { knex } = require('../../core/server/data/db');
const settingsCache = require('../../core/shared/settings-cache');
const sentry = require('../../core/shared/sentry');
const labs = require('../../core/shared/labs');

const endpoint = 'https://tinybird.example';
const statsPath = '/v0/pipes/api_automation_browse_stats.json';

describe('Tinybird provider consumers after boot', function () {
  const sandbox = sinon.createSandbox();
  const listeners = new Map<string, ReturnType<typeof process.rawListeners>>();
  const previousInstance = tinybird.instance;
  let serverStart: sinon.SinonSpy;
  let ghostServer: GhostServer | undefined;
  let fixturesCreated = false;

  beforeAll(function () {
    for (const event of ['SIGINT', 'SIGTERM', 'unhandledRejection'] as const) {
      listeners.set(event, process.rawListeners(event));
    }
    serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('sentry:disabled', true);
    configUtils.set('tinybird', null);
    sandbox
      .stub(settingsCache, 'get')
      .callThrough()
      .withArgs('web_analytics_enabled')
      .returns(false);
    const featureFlags = sandbox.stub(labs, 'isSet').callThrough();
    featureFlags.withArgs('automations').returns(true);
    featureFlags.withArgs('automationRunAnalytics').returns(false);
  });

  it('keeps automations on the last published provider across requests and a same-process reboot', async function () {
    ghostServer = await startGhost({ server: true });
    assert.ok(ghostServer);
    await fixtureManager.init();
    fixturesCreated = true;
    await setupAutomationsFixture();
    assert.equal(settingsCache.get('web_analytics_enabled'), false);
    assert.equal(tinybird.instance, undefined);
    const originURL = configUtils.config.get('url');
    const admin = new AdminAPITestAgent(ghostServer.rootApp, {
      apiURL: '/ghost/api/admin/',
      originURL,
    });
    let cookies = await admin.loginAs(null, null, 'owner');
    const http = supertest(configUtils.getServerUrl());
    const get = (route: string) =>
      http
        .get(`/ghost/api/admin/${route}/`)
        .set('Cookie', cookies)
        .set('Origin', originURL)
        .expect(200);
    const { body: initial } = await get('automations');
    assert.equal(initial.automations.length, 2);
    let automationId = initial.automations[0].id;
    const emptyStats = {
      last_run_created_at: null,
      total_run_count: 0,
      in_progress_run_count: 0,
    };
    assert.deepEqual(initial.automations[0].stats, emptyStats);
    const configFor = (token: string) => ({ stats: { endpoint, token, version: 'v2' } });
    const intercept = (token: string, count: number) =>
      nock(endpoint, { reqheaders: { authorization: `Bearer ${token}` } })
        .get(statsPath)
        .query({ site_uuid: settingsCache.get('site_uuid'), ghost_client: 'server' })
        .reply(200, {
          data: [
            {
              automation_id: automationId,
              last_run_created_at: null,
              total_run_count: count,
              in_progress_run_count: 0,
            },
          ],
        });
    const assertCount = async (count: number) => {
      const { body } = await get('automations');
      const automation = body.automations.find(
        (candidate: { id: string }) => candidate.id === automationId,
      );
      assert.ok(automation);
      assert.deepEqual(automation.stats, { ...emptyStats, total_run_count: count });
    };

    // Adding configuration does not make browsing initialize a provider.
    // Keep the same interceptor for the first browse after the token request.
    configUtils.set('tinybird', configFor('provider-a'));
    const first = intercept('provider-a', 7);
    await assertCount(0);
    assert.equal(tinybird.instance, undefined);
    assert.equal(first.isDone(), false);
    const tokenA = await get('tinybird/token');
    assert.deepEqual(tokenA.body.tinybird, { token: 'provider-a' });
    await assertCount(7);
    first.done();

    // A changed config alone must not refresh the consumer's provider.
    configUtils.set('tinybird', configFor('provider-b'));
    const unchanged = intercept('provider-a', 9);
    await assertCount(9);
    unchanged.done();

    // The same already-loaded consumer sees the provider published later.
    const tokenB = await get('tinybird/token');
    assert.deepEqual(tokenB.body.tinybird, { token: 'provider-b' });
    const publishedB = tinybird.instance;
    const refreshed = intercept('provider-b', 11);
    await assertCount(11);
    refreshed.done();

    // Stats keeps its API across same-process boots, so its construction path
    // does not publish the newly configured provider during this second boot.
    const previousStatsAPI = stats.api;
    assert.ok(previousStatsAPI);
    await ghostServer.stop();
    ghostServer = undefined;
    configUtils.set('tinybird', configFor('provider-c'));
    ghostServer = await startGhost({ server: true });
    assert.ok(ghostServer);
    assert.equal(stats.api, previousStatsAPI);
    assert.equal(tinybird.instance, publishedB);
    await fixtureManager.init();
    await setupAutomationsFixture();
    automationId = (await knex('automations').select('id').orderBy('name').first()).id;
    const rebootedAdmin = new AdminAPITestAgent(ghostServer.rootApp, {
      apiURL: '/ghost/api/admin/',
      originURL,
    });
    cookies = await rebootedAdmin.loginAs(null, null, 'owner');
    const afterReboot = intercept('provider-b', 13);
    await assertCount(13);
    afterReboot.done();
    const tokenC = await get('tinybird/token');
    assert.deepEqual(tokenC.body.tinybird, { token: 'provider-c' });
    const refreshedAfterReboot = intercept('provider-c', 15);
    await assertCount(15);
    refreshedAfterReboot.done();
  });

  afterAll(async function () {
    try {
      const started = (serverStart.lastCall?.thisValue as GhostServer | undefined) ?? ghostServer;
      await started?.stop();
    } finally {
      try {
        if (fixturesCreated) {
          await cleanupAutomationsFixture();
        }
      } finally {
        tinybird.instance = previousInstance;
        sandbox.restore();
        nock.cleanAll();
        for (const [event, originalListeners] of listeners) {
          process.removeAllListeners(event);
          for (const listener of originalListeners) {
            process.on(event, listener as (...args: unknown[]) => void);
          }
        }
        await configUtils.restore();
      }
    }
  });
});
