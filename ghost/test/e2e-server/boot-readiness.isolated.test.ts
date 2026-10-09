import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';
import type { JobsService } from '../../core/server/services/jobs-service/jobs-service';

const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const {
  JobsService: JobsServiceClass,
} = require('../../core/server/services/jobs-service/jobs-service');
const { automationsService } = require('../../core/server/services/automations');
const configUtils = require('../utils/config-utils');
const notify = require('../../core/server/notify');
const sentry = require('../../core/shared/sentry');
const { startGhost } = require('../utils/e2e-framework');

describe('Boot readiness over HTTP', function () {
  it('serves maintenance until jobs startup finishes, then stops jobs after the HTTP drain', async function () {
    const sandbox = sinon.createSandbox();
    const listeners = new Map(
      (['SIGINT', 'SIGTERM', 'unhandledRejection'] as const).map((event) => [
        event,
        process.rawListeners(event),
      ]),
    );
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const originalStart = JobsServiceClass.prototype.start;
    const originalAutomationsInit = automationsService.init;
    const order: string[] = [];
    let boot: Promise<GhostServer> | undefined;
    let jobsStart: Promise<void> | undefined;
    let stopped = false;

    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    notify.resetNotifications();
    const started = sandbox.spy(notify, 'notifyServerStarted');
    const ready = sandbox.spy(notify, 'notifyServerReady');
    const serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    const stopHTTP = sandbox.spy(GhostServerClass.prototype, '_stopServer');
    const jobsShutdown = sandbox.spy(JobsServiceClass.prototype, 'shutdown');
    sandbox.stub(JobsServiceClass.prototype, 'start').callsFake(function (this: JobsService) {
      jobsStart = (async () => {
        entered.resolve();
        await release.promise;
        await originalStart.call(this);
        order.push('jobs started');
      })();
      return jobsStart;
    });
    // Boot's next step after jobs startup. If boot stopped awaiting jobs, it
    // would run synchronously after start() returns.
    const automationsInit = sandbox.stub(automationsService, 'init').callsFake(function (
      this: unknown,
      ...args: unknown[]
    ) {
      order.push('automations init');
      return originalAutomationsInit.apply(this, args);
    });

    try {
      // This file gets a cold process. The helper prepares real content and DB
      // fixtures, and boot starts the real listener and all required services.
      const bootPromise: Promise<GhostServer> = startGhost({ frontend: true, server: true });
      boot = bootPromise;
      await Promise.race([
        entered.promise,
        bootPromise.then(() => {
          throw new Error('Boot finished without waiting for the jobs service');
        }),
      ]);

      const ghostServer = serverStart.firstCall?.thisValue as GhostServer | undefined;
      assert.ok(ghostServer);
      sinon.assert.notCalled(automationsInit);
      sinon.assert.calledOnce(started);
      const agent = supertest(configUtils.getServerUrl());
      const maintenance = await agent.get('/ghost/api/admin/site/').expect(503);
      assert.match(maintenance.headers['cache-control'], /\bno-store\b/);
      assert.match(maintenance.headers['content-type'], /text\/html/);
      sinon.assert.notCalled(ready);
      sinon.assert.notCalled(automationsInit);

      release.resolve();
      assert.equal(await boot, ghostServer);
      assert.deepEqual(order, ['jobs started', 'automations init']);
      sinon.assert.calledOnceWithExactly(ready);
      const response = await agent.get('/ghost/api/admin/site/').expect(200);
      assert.match(response.headers['content-type'], /application\/json/);
      assert.equal(typeof response.body.site.version, 'string');
      assert.equal(typeof response.body.site.site_uuid, 'string');

      // The jobs cleanup reads the shutdown timeout when it runs.
      configUtils.set('server:shutdownTimeout', 4321);
      sinon.assert.notCalled(jobsShutdown);
      stopped = true;
      await ghostServer.stop();
      sinon.assert.calledOnceWithExactly(jobsShutdown, { timeoutMs: 4321 });
      sinon.assert.callOrder(stopHTTP, jobsShutdown);
    } finally {
      // Always settle the real initializer before stopping its worker or
      // restoring the wrappers, including when a pending-boot assertion fails.
      release.resolve();
      try {
        await Promise.allSettled([boot, jobsStart]);
      } finally {
        try {
          if (!stopped) {
            const ghostServer = serverStart.firstCall?.thisValue as GhostServer | undefined;
            await ghostServer?.stop();
          }
        } finally {
          sandbox.restore();
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
