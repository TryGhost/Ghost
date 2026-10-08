import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';
import type { ExplorePingService as ExploreService } from '../../core/server/services/explore-ping/explore-ping-service';

const nock = require('nock');
const { startGhost, configUtils } = require('../utils/e2e-framework');
const config = require('../../core/shared/config');
const settingsCache = require('../../core/shared/settings-cache');
const EXPLORE_PATH = require.resolve('../../core/server/services/explore-ping');
const explore = require(EXPLORE_PATH);
const {
  ExplorePingService,
} = require('../../core/server/services/explore-ping/explore-ping-service');
const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const notify = require('../../core/server/notify');
const sentry = require('../../core/shared/sentry');

async function within<T>(promise: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describe('Explore ping during boot', function () {
  it('serves HTTP while the real statistics ping awaits its response', async function () {
    const sandbox = sinon.createSandbox();
    const listeners = new Map(
      (['SIGINT', 'SIGTERM', 'unhandledRejection'] as const).map((event) => [
        event,
        process.rawListeners(event),
      ]),
    );
    const initialized = Promise.withResolvers<void>();
    const received = Promise.withResolvers<Record<string, unknown>>();
    const release = Promise.withResolvers<void>();
    let boot: Promise<GhostServer> | undefined;
    let ghostServer: GhostServer | undefined;
    let allowExplore = false;

    configUtils.set('sentry:disabled', true);
    configUtils.set('explore:update_url', 'https://explore.example/update');
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    notify.resetNotifications();
    const ready = sandbox.spy(notify, 'notifyServerReady');
    const serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    const originalPing = ExplorePingService.prototype.ping;
    const ping = sandbox
      .stub(ExplorePingService.prototype, 'ping')
      .callsFake(function (this: ExploreService) {
        const sharedSettings = this.settingsCache;
        this.settingsCache = {
          get(key: string) {
            if (['explore_ping', 'explore_ping_growth', 'stripe_connect_livemode'].includes(key)) {
              return true;
            }
            return sharedSettings.get(key);
          },
        };
        return originalPing.call(this);
      });
    const originalModule = require.cache[EXPLORE_PATH];
    assert.ok(originalModule);
    const originalInit = explore.init;
    const originalPolicy = config.isProductionOrDevelopment;
    sandbox.stub(config, 'isProductionOrDevelopment').callsFake(() => {
      return allowExplore || originalPolicy();
    });
    // Enable only this initializer's environment gate. Other boot services keep
    // their test-environment behavior; the root unit tests cover the real policy.
    const init = (...args: unknown[]) => {
      allowExplore = true;
      try {
        return originalInit(...args);
      } finally {
        allowExplore = false;
        initialized.resolve();
      }
    };
    require.cache[EXPLORE_PATH] = { ...originalModule, exports: { ...explore, init } };
    const endpoint = nock('https://explore.example')
      .post('/update')
      .matchHeader('Content-Type', 'application/json')
      .reply(202, async (uri: string, body: Record<string, unknown>) => {
        received.resolve(body);
        await release.promise;
        return {};
      });

    try {
      const bootPromise: Promise<GhostServer> = startGhost({ frontend: true, server: true });
      boot = bootPromise;
      void bootPromise.catch(() => {});
      // Database reset and the rest of boot happen before Explore starts.
      // Apply the payload deadline only once its initializer has run.
      await Promise.race([initialized.promise, bootPromise]);
      const payload = await within(received.promise, 'Boot never sent its Explore payload');
      // Real Posts, Members and Stats roots query the default database fixtures.
      // In particular, the real Stats API yields its zero-MRR currency entry;
      // a missing or renamed facade would silently produce an empty array.
      assert.equal(payload.posts_total, 11);
      assert.equal(typeof payload.posts_first, 'string');
      assert.equal(typeof payload.posts_last, 'string');
      assert.equal(new Date(payload.posts_first as string).toISOString(), payload.posts_first);
      assert.equal(new Date(payload.posts_last as string).toISOString(), payload.posts_last);
      assert.equal(payload.members_total, 0);
      assert.deepEqual(payload.mrr, [{ currency: 'usd', mrr: 0 }]);
      assert.equal(payload.site_uuid, settingsCache.get('site_uuid'));
      assert.equal(payload.url, config.get('url'));
      sinon.assert.calledOnce(ping);
      let completed = false;
      void ping.firstCall.returnValue.then(
        () => {
          completed = true;
        },
        () => {
          completed = true;
        },
      );
      ghostServer = await within(bootPromise, 'Boot waited for the Explore response');
      sinon.assert.calledOnceWithExactly(ready);
      sinon.assert.calledOnce(ping);
      assert.equal(settingsCache.get('stripe_connect_livemode'), null);
      assert.equal(settingsCache.get('explore_ping_growth'), false);
      await supertest(configUtils.getServerUrl()).get('/ghost/api/admin/site/').expect(200);
      assert.equal(completed, false, 'Ping finished before the Explore response');
      release.resolve();
      assert.equal(await ping.firstCall.returnValue, undefined);
      endpoint.done();
    } finally {
      release.resolve();
      try {
        await Promise.allSettled([boot, ...ping.returnValues]);
      } finally {
        try {
          const startedServer =
            ghostServer ?? (serverStart.firstCall?.thisValue as GhostServer | undefined);
          await startedServer?.stop();
        } finally {
          require.cache[EXPLORE_PATH] = originalModule;
          sandbox.restore();
          nock.cleanAll();
          notify.resetNotifications();
          for (const [event, originalListeners] of listeners) {
            process.removeAllListeners(event);
            for (const listener of originalListeners) {
              process.on(event, listener as (...args: unknown[]) => void);
            }
          }
          await configUtils.restore();
        }
      }
    }
  });
});
