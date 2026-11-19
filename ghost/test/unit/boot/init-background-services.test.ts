import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

function createBackgroundHarness(environment = 'production') {
  const emailAnalyticsJobs = { scheduleRecurringJobs: sinon.stub().resolves() };
  const recovery = sinon.stub().resolves();
  const giftRecovery = sinon.stub().resolves();
  const activity = sinon.stub().resolves();
  const themes = { loadInactiveThemes: sinon.stub() };
  const logging = { error: sinon.stub() };
  const updateCheck = { scheduleJobs: sinon.stub().resolves() };
  const tinybirdSync = { scheduleJob: sinon.stub().resolves() };
  const milestones = { initAndRun: sinon.stub() };
  const signingKeys = { extras: { scheduleCheckJob: sinon.stub().resolves() } };
  const authCleanup = { scheduleClearExpiredJob: sinon.stub().resolves() };
  const jobsInstance = {};
  const initBackgroundServices = loadBootFunction(
    'initBackgroundServices',
    {
      '@tryghost/logging': logging,
      './server/services/email-analytics/jobs': emailAnalyticsJobs,
      './server/services/themes': themes,
      './server/services/email-service': { service: { resumeInterruptedSends: recovery } },
      './server/services/gifts': { recoverPendingDeliveries: giftRecovery },
      './server/services/gifts/jobs': {
        scheduleGiftCleanupJob: async () => {},
        scheduleGiftReminderJob: async () => {},
      },
      './server/services/members/jobs': {
        scheduleTokenCleanupJob: async () => {},
        scheduleExpiredCompCleanupJob: async () => {},
      },
      './server/services/signing-keys': { default: signingKeys },
      './server/auth/better-auth/cleanup': authCleanup,
      './server/services/jobs-service': { getInstance: () => jobsInstance },
      './server/services/activitypub': { init: activity },
      './server/services/tinybird-sync': tinybirdSync,
      './server/services/update-check': updateCheck,
      './server/services/remote-flags': { init() {} },
      './server/services/milestones': milestones,
    },
    { globals: { process: { env: { NODE_ENV: environment } } } },
  );
  return {
    init: (): Promise<void> => initBackgroundServices({ config: { get: () => true } }),
    themes,
    recovery,
    giftRecovery,
    activity,
    emailAnalyticsJobs,
    logging,
    updateCheck,
    tinybirdSync,
    milestones,
    signingKeys,
    authCleanup,
    jobsInstance,
  };
}

for (const environment of ['test', 'testing', 'testing-mysql']) {
  it(`loads inactive themes but skips interrupted-send recovery in ${environment}`, async function () {
    const boot = createBackgroundHarness(environment);
    await boot.init();

    sinon.assert.calledOnce(boot.themes.loadInactiveThemes);
    sinon.assert.notCalled(boot.recovery);
    sinon.assert.notCalled(boot.giftRecovery);
    sinon.assert.notCalled(boot.activity);
    sinon.assert.notCalled(boot.milestones.initAndRun);
  });
}

for (const environment of ['development', 'production']) {
  it(`waits for interrupted-send recovery before continuing background startup in ${environment}`, async function () {
    const boot = createBackgroundHarness(environment);
    const release = Promise.withResolvers<void>();
    boot.recovery.returns(release.promise);
    const startup = boot.init();

    try {
      await setImmediate();
      sinon.assert.calledOnce(boot.recovery);
      sinon.assert.notCalled(boot.giftRecovery);
      sinon.assert.notCalled(boot.activity);
      sinon.assert.notCalled(boot.milestones.initAndRun);
    } finally {
      release.resolve();
      await startup;
    }

    sinon.assert.calledOnce(boot.giftRecovery);
    sinon.assert.calledOnce(boot.activity);
    sinon.assert.calledOnce(boot.milestones.initAndRun);
    sinon.assert.callOrder(
      boot.recovery,
      boot.giftRecovery,
      boot.activity,
      boot.milestones.initAndRun,
    );
  });
}

it('keeps starting background services when email analytics scheduling fails', async function () {
  const boot = createBackgroundHarness();
  const failure = new Error('email analytics scheduling failed');
  boot.emailAnalyticsJobs.scheduleRecurringJobs.rejects(failure);
  await boot.init();

  sinon.assert.calledOnceWithExactly(boot.logging.error, failure);
  sinon.assert.calledOnce(boot.updateCheck.scheduleJobs);
  sinon.assert.calledOnce(boot.tinybirdSync.scheduleJob);
  sinon.assert.calledOnce(boot.milestones.initAndRun);
});

it('awaits signing-key job registration before later background work using the shared jobs instance', async function () {
  const boot = createBackgroundHarness();
  const ready = Promise.withResolvers<void>();
  boot.signingKeys.extras.scheduleCheckJob.returns(ready.promise);
  const startup = boot.init();

  try {
    await setImmediate();
    sinon.assert.calledOnceWithExactly(
      boot.signingKeys.extras.scheduleCheckJob,
      sinon.match.same(boot.jobsInstance),
    );
    sinon.assert.notCalled(boot.emailAnalyticsJobs.scheduleRecurringJobs);
    sinon.assert.notCalled(boot.activity);
    sinon.assert.notCalled(boot.tinybirdSync.scheduleJob);
    sinon.assert.notCalled(boot.updateCheck.scheduleJobs);
    sinon.assert.notCalled(boot.milestones.initAndRun);
  } finally {
    ready.resolve();
    await Promise.allSettled([startup]);
  }
  await startup;

  sinon.assert.calledOnce(boot.activity);
  sinon.assert.calledOnceWithExactly(
    boot.tinybirdSync.scheduleJob,
    sinon.match.same(boot.jobsInstance),
  );
  sinon.assert.calledOnceWithExactly(
    boot.updateCheck.scheduleJobs,
    sinon.match.same(boot.jobsInstance),
  );
  sinon.assert.calledOnce(boot.milestones.initAndRun);
});

it('logs signing-key job registration failures and continues background startup', async function () {
  const boot = createBackgroundHarness();
  const failure = new Error('signing-key job registration failed');
  boot.signingKeys.extras.scheduleCheckJob.rejects(failure);

  await boot.init();

  sinon.assert.calledOnceWithExactly(
    boot.signingKeys.extras.scheduleCheckJob,
    sinon.match.same(boot.jobsInstance),
  );
  sinon.assert.calledOnceWithExactly(boot.logging.error, failure);
  sinon.assert.calledOnce(boot.emailAnalyticsJobs.scheduleRecurringJobs);
  sinon.assert.calledOnce(boot.activity);
  sinon.assert.calledOnceWithExactly(
    boot.tinybirdSync.scheduleJob,
    sinon.match.same(boot.jobsInstance),
  );
  sinon.assert.calledOnceWithExactly(
    boot.updateCheck.scheduleJobs,
    sinon.match.same(boot.jobsInstance),
  );
  sinon.assert.calledOnce(boot.milestones.initAndRun);
});

it('schedules the expired auth row cleanup on the shared jobs instance', async function () {
  const boot = createBackgroundHarness();

  await boot.init();

  sinon.assert.calledOnceWithExactly(
    boot.authCleanup.scheduleClearExpiredJob,
    sinon.match.same(boot.jobsInstance),
  );
});

it('logs a failed auth cleanup schedule and continues background startup', async function () {
  const boot = createBackgroundHarness();
  const failure = new Error('auth cleanup registration failed');
  boot.authCleanup.scheduleClearExpiredJob.rejects(failure);

  await boot.init();

  sinon.assert.calledOnceWithExactly(boot.logging.error, failure);
  sinon.assert.calledOnce(boot.activity);
});
