import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';

const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const {
  JobsService: JobsServiceClass,
} = require('../../core/server/services/jobs-service/jobs-service');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const express = require('express');
const configUtils = require('../utils/config-utils');
const notify = require('../../core/server/notify');
const sentry = require('../../core/shared/sentry');
const { startGhost } = require('../utils/e2e-framework');

describe('Required startup failure', function () {
  it('reports the startup error and closes the listener without becoming ready', async function () {
    const sandbox = sinon.createSandbox();
    const listeners = new Map(
      (['SIGINT', 'SIGTERM', 'unhandledRejection'] as const).map((event) => [
        event,
        process.rawListeners(event),
      ]),
    );
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const startupError = new errors.IncorrectUsageError({ message: 'Required startup failed' });
    let boot: Promise<unknown> | undefined;
    let jobsStart: Promise<void> | undefined;

    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    const logError = sandbox.stub(logging, 'error');
    sandbox.stub(console, 'error');
    const exit = sandbox.stub(process, 'exit');
    notify.resetNotifications();
    const ready = sandbox.spy(notify, 'notifyServerReady');
    const serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    // Retain the real listener even after GhostServer clears its own reference.
    const listen = sandbox.spy(express.application, 'listen');
    const shutdown = sandbox.spy(GhostServerClass.prototype, 'shutdown');
    sandbox.stub(JobsServiceClass.prototype, 'start').callsFake(() => {
      jobsStart = (async () => {
        entered.resolve();
        await release.promise;
        throw startupError;
      })();
      return jobsStart;
    });

    try {
      // All preceding initialization and registered cleanup tasks are real;
      // only the required jobs-start boundary is made to fail.
      const bootPromise: Promise<unknown> = startGhost({ frontend: true, server: true });
      boot = bootPromise;
      await Promise.race([
        entered.promise,
        bootPromise.then(() => {
          throw new Error('Boot finished without reaching jobs startup');
        }),
      ]);

      const ghostServer = serverStart.firstCall?.thisValue as GhostServer | undefined;
      assert.ok(ghostServer?.rootApp);
      const httpServer = listen.firstCall?.returnValue;
      assert.ok(httpServer?.listening);
      const maintenance = await supertest(configUtils.getServerUrl())
        .get('/ghost/api/admin/site/')
        .expect(503);
      assert.match(maintenance.headers['cache-control'], /\bno-store\b/);
      sinon.assert.notCalled(ready);
      sinon.assert.notCalled(exit);

      release.resolve();
      await boot;
      sinon.assert.calledOnceWithExactly(ready, startupError);
      sinon.assert.calledOnceWithExactly(shutdown, 2);
      // Boot initiates shutdown without awaiting it. Observe the real shutdown
      // separately so the assertions include cleanup and the requested exit.
      await shutdown.firstCall.returnValue;
      sinon.assert.calledOnceWithExactly(logError, startupError);
      sinon.assert.calledOnceWithExactly(exit, 2);
      assert.equal(httpServer.listening, false, 'Startup failure left the HTTP listener open');
      assert.equal(httpServer.address(), null);
    } finally {
      release.resolve();
      try {
        await Promise.allSettled([boot, jobsStart]);
        if (shutdown.called) {
          await Promise.allSettled(shutdown.getCalls().map((call) => call.returnValue));
        } else {
          const ghostServer = serverStart.firstCall?.thisValue as GhostServer | undefined;
          await ghostServer?.stop();
        }
      } finally {
        try {
          // A broken shutdown must still leave the test runner without a listener.
          const httpServer = listen.firstCall?.returnValue;
          if (httpServer?.listening) {
            await promisify(httpServer.close).call(httpServer);
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
