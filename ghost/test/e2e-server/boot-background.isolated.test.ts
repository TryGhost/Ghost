import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';

const { startGhost, configUtils } = require('../utils/e2e-framework');
const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const EmailService = require('../../core/server/services/email-service/email-service');
const emailService = require('../../core/server/services/email-service');
const { GiftDeliveryService } = require('../../core/server/services/gifts/gift-delivery-service');
const themes = require('../../core/server/services/themes');
const activitypub = require('../../core/server/services/activitypub');
const updateCheck = require('../../core/server/services/update-check');
const milestones = require('../../core/server/services/milestones');
const notify = require('../../core/server/notify');
const sentry = require('../../core/shared/sentry');

// A regression that starts awaiting background work must fail, then release the
// held operation in finally. Awaiting boot without a deadline would deadlock.
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

describe('Background startup', function () {
  it('returns a ready HTTP server while interrupted-send recovery is pending', async function () {
    const sandbox = sinon.createSandbox();
    const originalEnvironment = process.env.NODE_ENV;
    const restoreEnvironment = () => {
      if (originalEnvironment === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalEnvironment;
      }
    };
    const listeners = new Map(
      (['SIGINT', 'SIGTERM', 'unhandledRejection'] as const).map((event) => [
        event,
        process.rawListeners(event),
      ]),
    );
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const continued = Promise.withResolvers<void>();
    let boot: Promise<GhostServer> | undefined;
    let ghostServer: GhostServer | undefined;
    let themeLoad: Promise<unknown> | undefined;

    configUtils.set('sentry:disabled', true);
    configUtils.set('backgroundJobs:emailAnalytics', false);
    configUtils.set('remoteFlags:enabled', false);
    configUtils.set('tinybird:sync_auth_key', null);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    notify.resetNotifications();
    const ready = sandbox.spy(notify, 'notifyServerReady');
    const serverStart = sandbox.spy(GhostServerClass.prototype, 'start');

    // Enter the real background path without running database setup or required
    // foreground services under production settings. These two calls surround
    // the synchronous test-environment guard in initBackgroundServices.
    const loadInactiveThemes = themes.loadInactiveThemes;
    sandbox.stub(themes, 'loadInactiveThemes').callsFake(() => {
      themeLoad = Promise.resolve(loadInactiveThemes());
      process.env.NODE_ENV = 'production';
      return themeLoad;
    });
    const recovery = sandbox
      .stub(EmailService.prototype, 'resumeInterruptedSends')
      .callsFake(() => {
        restoreEnvironment();
        entered.resolve();
        return release.promise;
      });

    // Gift recovery first reschedules deliveries, then retries sends in an
    // unawaited chain. Settle both stages without creating timers or sending mail.
    sandbox.stub(GiftDeliveryService.prototype, 'reschedulePending').resolves();
    sandbox.stub(GiftDeliveryService.prototype, 'recoverPending').resolves({
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
    });
    // These later services start provider work and long-lived timers.
    sandbox.stub(activitypub, 'init').resolves();
    sandbox.stub(updateCheck, 'scheduleJobs').resolves();
    sandbox.stub(milestones, 'initAndRun').callsFake(() => {
      continued.resolve();
      return Promise.resolve();
    });

    try {
      const bootPromise: Promise<GhostServer> = startGhost({ frontend: true, server: true });
      boot = bootPromise;
      await Promise.race([
        entered.promise,
        bootPromise.then(() => {
          assert.ok(recovery.called, 'Boot never entered interrupted-send recovery');
        }),
      ]);
      ghostServer = await within(bootPromise, 'Boot waited for pending background recovery');
      assert.ok(ghostServer);
      sinon.assert.calledOnceWithExactly(ready);
      sinon.assert.calledOnceWithExactly(recovery);
      sinon.assert.calledOn(recovery, emailService.service);
      sinon.assert.callOrder(ready, recovery);

      const agent = supertest(configUtils.getServerUrl());
      const response = await agent.get('/ghost/api/admin/site/').expect(200);
      assert.equal(typeof response.body.site.title, 'string');
    } finally {
      restoreEnvironment();
      release.resolve();
      try {
        await Promise.allSettled([boot, themeLoad]);
        // Wait once, only during cleanup. A failed continuation must not incur
        // a second deadline and mask its diagnostic with the suite timeout.
        if (recovery.called) {
          await within(continued.promise, 'Background startup did not continue after recovery');
        }
      } finally {
        try {
          const startedServer =
            ghostServer ?? (serverStart.firstCall?.thisValue as GhostServer | undefined);
          await startedServer?.stop();
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
