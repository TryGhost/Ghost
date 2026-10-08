import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import type { Application } from 'express';
import type { GhostServer } from '../../core/server/ghost-server';

const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const { startGhost, configUtils } = require('../utils/e2e-framework');
const announcement = require('../../core/server/services/announcement-bar-service');
const controller = require('../../core/server/api/endpoints/announcements');
const settingsCache = require('../../core/shared/settings-cache');
const jobs = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const notify = require('../../core/server/notify');
const sentry = require('../../core/shared/sentry');
const routeSettings = require('../../core/server/services/route-settings');

describe('Announcement initialization over HTTP', function () {
  const sandbox = sinon.createSandbox();
  let listeners: Map<string, ReturnType<typeof process.rawListeners>>;
  let release: ReturnType<typeof Promise.withResolvers<void>> | undefined;
  let boot: Promise<unknown> | undefined;
  let serverStart: sinon.SinonSpy;
  let stoppedServer: GhostServer | undefined;

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
    stoppedServer = undefined;
  });

  afterEach(async function () {
    // A separate hook preserves a test assertion failure if cleanup also fails.
    release?.resolve();
    try {
      await Promise.allSettled([boot]);
      for (const call of serverStart.getCalls()) {
        const server = call.thisValue as GhostServer;
        if (server !== stoppedServer) {
          await server.stop();
        }
      }
      // No-server boots return an Express app; these resources have their own owners.
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
  });

  it('awaits announcement initialization before HTTP readiness', async function () {
    const entered = Promise.withResolvers<void>();
    release = Promise.withResolvers<void>();
    const originalInit = announcement.init;
    const ready = sandbox.spy(notify, 'notifyServerReady');
    // This is the next boot stage after announcement initialization. A missing
    // await calls it synchronously before the entered continuation resumes.
    const nextStage = sandbox.spy(routeSettings, 'init');
    sandbox.stub(announcement, 'init').callsFake(async () => {
      entered.resolve();
      await release!.promise;
      await originalInit();
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
  });

  it('keeps the retained controller reading live settings after a server stop and a no-server reboot', async function () {
    const service = announcement.service;
    const firstBoot: Promise<GhostServer> = startGhost({ frontend: true, server: true });
    boot = firstBoot;
    const first = await firstBoot;
    const read = service.getAnnouncementSettings;
    settingsCache.set('announcement_content', { value: '<p>First boot</p>' });
    settingsCache.set('announcement_background', { value: 'dark' });
    settingsCache.set('announcement_visibility', { value: ['visitors'] });
    const { body: firstBody } = await supertest(configUtils.getServerUrl())
      .get('/members/api/announcement/')
      .expect(200);
    assert.deepEqual(firstBody, {
      announcement: [{ announcement: '<p>First boot</p>', announcement_background: 'dark' }],
    });

    await first.stop();
    stoppedServer = first;
    const secondBoot: Promise<Application> = startGhost({ frontend: true, server: false });
    boot = secondBoot;
    const second = await secondBoot;
    assert.equal(typeof second, 'function');
    assert.equal('stop' in second, false);
    assert.strictEqual(announcement.service, service);
    assert.strictEqual(require('../../core/server/api/endpoints/announcements'), controller);
    settingsCache.set('announcement_content', { value: '<p>Second boot</p>' });
    settingsCache.set('announcement_background', { value: 'light' });
    settingsCache.set('announcement_visibility', { value: ['visitors'] });
    const expected = {
      announcement: '<p>Second boot</p>',
      announcement_background: 'light',
    };
    const { body } = await supertest(second).get('/members/api/announcement/').expect(200);
    assert.deepEqual(body, { announcement: [expected] });
    assert.deepEqual(controller.browse.query({ options: {} }), expected);
    assert.deepEqual(read(), expected);
  });
});
