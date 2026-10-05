import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';
import type { JobsService } from '../../core/server/services/jobs-service/jobs-service';

const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const {
  JobsService: JobsServiceClass,
} = require('../../core/server/services/jobs-service/jobs-service');
const configUtils = require('../utils/config-utils');
const notify = require('../../core/server/notify');
const sentry = require('../../core/shared/sentry');
const { startGhost } = require('../utils/e2e-framework');

describe('Boot readiness over HTTP', function () {
  it('serves maintenance until required services finish starting', async function () {
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
    let boot: Promise<GhostServer> | undefined;
    let jobsStart: Promise<void> | undefined;

    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    notify.resetNotifications();
    const started = sandbox.spy(notify, 'notifyServerStarted');
    const ready = sandbox.spy(notify, 'notifyServerReady');
    const serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    sandbox.stub(JobsServiceClass.prototype, 'start').callsFake(function (this: JobsService) {
      jobsStart = (async () => {
        entered.resolve();
        await release.promise;
        await originalStart.call(this);
      })();
      return jobsStart;
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
      sinon.assert.calledOnce(started);
      const agent = supertest(configUtils.getServerUrl());
      const maintenance = await agent.get('/ghost/api/admin/site/').expect(503);
      assert.match(maintenance.headers['cache-control'], /\bno-store\b/);
      assert.match(maintenance.headers['content-type'], /text\/html/);
      sinon.assert.notCalled(ready);

      release.resolve();
      assert.equal(await boot, ghostServer);
      sinon.assert.calledOnceWithExactly(ready);
      const response = await agent.get('/ghost/api/admin/site/').expect(200);
      assert.match(response.headers['content-type'], /application\/json/);
      assert.equal(typeof response.body.site.version, 'string');
      assert.equal(typeof response.body.site.site_uuid, 'string');
    } finally {
      // Always settle the real initializer before stopping its worker or
      // restoring the wrappers, including when a pending-boot assertion fails.
      release.resolve();
      try {
        await Promise.allSettled([boot, jobsStart]);
      } finally {
        try {
          const ghostServer = serverStart.firstCall?.thisValue as GhostServer | undefined;
          await ghostServer?.stop();
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
