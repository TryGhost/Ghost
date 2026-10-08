import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import type { Application } from 'express';
import type { GhostServer } from '../../core/server/ghost-server';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';

const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const { startGhost, configUtils } = require('../utils/e2e-framework');
const { stopGhost } = require('../utils/e2e-utils');
const announcement = require('../../core/server/services/announcement-bar-service');
const controller = require('../../core/server/api/endpoints/announcements');
const settingsCache = require('../../core/shared/settings-cache');
const jobs = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const notify = require('../../core/server/notify');
const sentry = require('../../core/shared/sentry');
const routeSettings = require('../../core/server/services/route-settings');
const themes = require('../../core/server/services/themes');

type StoppableApp = Application & { stop(): Promise<void> };

describe('Announcement boot lifecycle', function () {
  const sandbox = sinon.createSandbox();
  let listeners: Map<string, ReturnType<typeof process.rawListeners>>;
  let release: ReturnType<typeof Promise.withResolvers<void>> | undefined;
  let boot: Promise<unknown> | undefined;
  let serverStart: sinon.SinonSpy;

  beforeEach(function () {
    listeners = new Map(
      ['SIGINT', 'SIGTERM', 'unhandledRejection'].map((event) => [
        event,
        process.rawListeners(event),
      ]),
    );
    serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('sentry:disabled', true);
    notify.resetNotifications();
    release = undefined;
    boot = undefined;
  });

  afterEach(async function () {
    // A separate hook preserves a test assertion failure if cleanup also fails.
    release?.resolve();
    try {
      await Promise.allSettled([boot]);
    } finally {
      try {
        await stopGhost();
        // A boot can fail before the test helper remembers its server.
        const server = serverStart.firstCall?.thisValue as GhostServer | undefined;
        if (server) {
          await server.stop();
        }
        // No-server stop owns the migrated root, not these legacy resources.
        await jobs.shutdown();
        await stripe.shutdown();
      } finally {
        sandbox.restore();
        notify.resetNotifications();
        for (const [event, originals] of listeners) {
          process.removeAllListeners(event);
          for (const listener of originals) {
            process.on(event, listener as (...args: unknown[]) => void);
          }
        }
        await configUtils.restore();
      }
    }
  });

  it('awaits announcement initialization before HTTP readiness and disposes it when the server stops', async function () {
    const entered = Promise.withResolvers<void>();
    release = Promise.withResolvers<void>();
    const originalInit = announcement.init;
    const ready = sandbox.spy(notify, 'notifyServerReady');
    // This is the next boot stage after announcement initialization. A missing
    // await calls it synchronously before the entered continuation resumes.
    const nextStage = sandbox.spy(routeSettings, 'init');
    sandbox.stub(announcement, 'init').callsFake(async (...args) => {
      entered.resolve();
      await release!.promise;
      await originalInit(...args);
    });

    const serverBoot: Promise<GhostServer> = startGhost({ frontend: true, server: true });
    boot = serverBoot;
    await Promise.race([
      entered.promise,
      serverBoot.then(() => {
        throw new Error('Boot returned without initializing announcements');
      }),
    ]);
    sinon.assert.notCalled(nextStage);
    const server = serverStart.firstCall?.thisValue as GhostServer | undefined;
    assert.ok(server);
    const http = supertest(configUtils.getServerUrl());
    await http.get('/members/api/announcement/').expect(503);
    sinon.assert.notCalled(ready);

    release.resolve();
    assert.strictEqual(await serverBoot, server);
    sinon.assert.calledOnce(nextStage);
    sinon.assert.calledOnceWithExactly(ready);
    settingsCache.set('announcement_content', { value: '<p>Ready</p>' });
    settingsCache.set('announcement_background', { value: 'dark' });
    settingsCache.set('announcement_visibility', { value: ['visitors'] });
    const { body } = await http.get('/members/api/announcement/').expect(200);
    assert.deepEqual(body, {
      announcement: [{ announcement: '<p>Ready</p>', announcement_background: 'dark' }],
    });

    await server.stop();
    assert.throws(() => controller.browse.query({ options: {} }), /announcement-bar-service/);
  });

  it('stops a no-server boot before restarting, keeping the old app unavailable', async function () {
    const firstBoot: Promise<StoppableApp> = startGhost({ frontend: true, server: false });
    boot = firstBoot;
    const first = await firstBoot;
    assert.equal(typeof first, 'function');
    await supertest(first).get('/members/api/announcement/').expect(200);

    await first.stop();
    assert.throws(() => controller.browse.query({ options: {} }), /announcement-bar-service/);
    await supertest(first).get('/members/api/announcement/').expect(503);

    const secondBoot: Promise<StoppableApp> = startGhost({ frontend: true, server: false });
    boot = secondBoot;
    const second = await secondBoot;
    assert.notStrictEqual(first, second);
    await first.stop();
    settingsCache.set('announcement_content', { value: '<p>Second boot</p>' });
    settingsCache.set('announcement_background', { value: 'light' });
    settingsCache.set('announcement_visibility', { value: ['visitors'] });
    await supertest(first).get('/members/api/announcement/').expect(503);
    const { body } = await supertest(second).get('/members/api/announcement/').expect(200);
    assert.deepEqual(body, {
      announcement: [{ announcement: '<p>Second boot</p>', announcement_background: 'light' }],
    });

    // The shared test helper owns teardown even when its caller has not
    // explicitly stopped the previous no-server app.
    const thirdBoot: Promise<StoppableApp> = startGhost({ frontend: true, server: false });
    boot = thirdBoot;
    const third = await thirdBoot;
    await supertest(second).get('/members/api/announcement/').expect(503);
    await second.stop();
    await supertest(third).get('/members/api/announcement/').expect(200);
    await third.stop();
    assert.throws(() => controller.browse.query({ options: {} }), /announcement-bar-service/);
  });

  it('disposes a failed no-server boot before exit and preserves the startup error', async function () {
    const failure = new errors.IncorrectUsageError({ message: 'Theme startup failed' });
    const cleanupFailure = new Error('Cleanup also failed');
    const interceptedExit = new Error('Intercepted exit');
    const reported = sandbox.stub(logging, 'error');
    sandbox.stub(console, 'error');
    const themeInit = sandbox.stub(themes, 'init').callsFake(async () => {
      assert.equal(typeof announcement.service.getAnnouncementSettings, 'function');
      throw failure;
    });
    const originalShutdown = announcement.shutdown;
    const shutdown = sandbox.stub(announcement, 'shutdown').callsFake(async (...args) => {
      await originalShutdown(...args);
      throw cleanupFailure;
    });
    const exit = sandbox.stub(process, 'exit').callsFake((code): never => {
      assert.equal(code, 2);
      assert.throws(() => controller.browse.query({ options: {} }), /announcement-bar-service/);
      throw interceptedExit;
    });

    const failedBoot = startGhost({ frontend: true, server: false });
    boot = failedBoot;
    await assert.rejects(failedBoot, (error) => error === interceptedExit);
    sinon.assert.calledOnce(exit);
    sinon.assert.calledOnce(shutdown);
    assert.strictEqual(reported.firstCall.args[0], cleanupFailure);
    assert.strictEqual(reported.lastCall.args[0], failure);

    themeInit.restore();
    shutdown.restore();
    // A fresh boot must not inherit ownership from the failed one.
    const recovered: Promise<StoppableApp> = startGhost({ frontend: true, server: false });
    boot = recovered;
    const app = await recovered;
    await supertest(app).get('/members/api/announcement/').expect(200);
    await app.stop();
  });
});
