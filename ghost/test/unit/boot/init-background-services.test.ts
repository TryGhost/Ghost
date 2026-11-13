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
  const giftJobs = {
    scheduleGiftCleanupJob: sinon.stub().resolves(),
    scheduleGiftReminderJob: sinon.stub().resolves(),
  };
  const memberJobs = {
    scheduleTokenCleanupJob: sinon.stub().resolves(),
    scheduleExpiredCompCleanupJob: sinon.stub().resolves(),
  };
  const remoteFlags = { init: sinon.stub() };
  const jobsInstance = {};
  const initBackgroundServices = loadBootFunction(
    'initBackgroundServices',
    {
      '@tryghost/logging': logging,
      './server/services/email-analytics/jobs': emailAnalyticsJobs,
      './server/services/themes': themes,
      './server/services/email-service': { service: { resumeInterruptedSends: recovery } },
      './server/services/gifts': { recoverPendingDeliveries: giftRecovery },
      './server/services/gifts/jobs': giftJobs,
      './server/services/members/jobs': memberJobs,
      './server/services/signing-keys': { default: signingKeys },
      './server/services/jobs-service': { getInstance: () => jobsInstance },
      './server/services/activitypub': { init: activity },
      './server/services/tinybird-sync': tinybirdSync,
      './server/services/update-check': updateCheck,
      './server/services/remote-flags': remoteFlags,
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
    giftJobs,
    memberJobs,
    remoteFlags,
    jobsInstance,
  };
}

type BackgroundHarness = ReturnType<typeof createBackgroundHarness>;

// Each step logs its own failure, so one failed registration cannot stop the steps after it.
const isolatedSteps: [string, (boot: BackgroundHarness) => sinon.SinonStub][] = [
  ['interrupted-send recovery', (boot) => boot.recovery],
  ['gift cleanup scheduling', (boot) => boot.giftJobs.scheduleGiftCleanupJob],
  ['gift reminder scheduling', (boot) => boot.giftJobs.scheduleGiftReminderJob],
  ['member token cleanup scheduling', (boot) => boot.memberJobs.scheduleTokenCleanupJob],
  [
    'expired complimentary cleanup scheduling',
    (boot) => boot.memberJobs.scheduleExpiredCompCleanupJob,
  ],
  ['signing-key check scheduling', (boot) => boot.signingKeys.extras.scheduleCheckJob],
  ['email analytics scheduling', (boot) => boot.emailAnalyticsJobs.scheduleRecurringJobs],
  ['Tinybird sync scheduling', (boot) => boot.tinybirdSync.scheduleJob],
  ['update check scheduling', (boot) => boot.updateCheck.scheduleJobs],
];

function backgroundSteps(boot: BackgroundHarness): sinon.SinonStub[] {
  return [
    boot.themes.loadInactiveThemes,
    boot.recovery,
    boot.giftRecovery,
    boot.giftJobs.scheduleGiftCleanupJob,
    boot.giftJobs.scheduleGiftReminderJob,
    boot.memberJobs.scheduleTokenCleanupJob,
    boot.memberJobs.scheduleExpiredCompCleanupJob,
    boot.signingKeys.extras.scheduleCheckJob,
    boot.emailAnalyticsJobs.scheduleRecurringJobs,
    boot.activity,
    boot.tinybirdSync.scheduleJob,
    boot.updateCheck.scheduleJobs,
    boot.remoteFlags.init,
    boot.milestones.initAndRun,
  ];
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

it('starts every background step once, in order', async function () {
  const boot = createBackgroundHarness();
  await boot.init();

  const steps = backgroundSteps(boot);
  for (const step of steps) {
    sinon.assert.calledOnce(step);
  }
  sinon.assert.callOrder(...steps);
  sinon.assert.notCalled(boot.logging.error);
});

it('passes the shared jobs instance to each job registration', async function () {
  const boot = createBackgroundHarness();
  await boot.init();

  for (const schedule of [
    boot.giftJobs.scheduleGiftCleanupJob,
    boot.giftJobs.scheduleGiftReminderJob,
    boot.memberJobs.scheduleTokenCleanupJob,
    boot.memberJobs.scheduleExpiredCompCleanupJob,
  ]) {
    sinon.assert.calledOnceWithExactly(schedule, sinon.match.same(boot.jobsInstance));
  }
});

for (const [name, getStep] of isolatedSteps) {
  it(`logs a rejected ${name} and continues background startup`, async function () {
    const boot = createBackgroundHarness();
    const failure = new Error(`${name} failed`);
    getStep(boot).rejects(failure);

    await boot.init();

    sinon.assert.calledOnceWithExactly(boot.logging.error, failure);
    for (const step of backgroundSteps(boot)) {
      sinon.assert.calledOnce(step);
    }
  });

  it(`logs a ${name} that throws and continues background startup`, async function () {
    const boot = createBackgroundHarness();
    const failure = new Error(`${name} threw`);
    getStep(boot).throws(failure);

    await boot.init();

    sinon.assert.calledOnceWithExactly(boot.logging.error, failure);
    for (const step of backgroundSteps(boot)) {
      sinon.assert.calledOnce(step);
    }
  });

  it(`waits for ${name} before starting the next step`, async function () {
    const boot = createBackgroundHarness();
    const steps = backgroundSteps(boot);
    const step = getStep(boot);
    const release = Promise.withResolvers<void>();
    step.returns(release.promise);
    const startup = boot.init();

    try {
      await setImmediate();
      sinon.assert.calledOnce(step);
      for (const later of steps.slice(steps.indexOf(step) + 1)) {
        sinon.assert.notCalled(later);
      }
    } finally {
      release.resolve();
      await startup;
    }
  });
}

it('stops background startup when ActivityPub fails, after the earlier jobs are scheduled', async function () {
  const boot = createBackgroundHarness();
  const failure = new Error('activitypub unavailable');
  boot.activity.rejects(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  const steps = backgroundSteps(boot);
  const activityIndex = steps.indexOf(boot.activity);
  for (const step of steps.slice(0, activityIndex + 1)) {
    sinon.assert.calledOnce(step);
  }
  for (const step of steps.slice(activityIndex + 1)) {
    sinon.assert.notCalled(step);
  }
  sinon.assert.notCalled(boot.logging.error);
});
