import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import sinon from 'sinon';

function createServicesHarness({ rescheduleOnBoot = true } = {}) {
  const stripe = sinon.stub().resolves();
  // These initializers are synchronous in production.
  const gifts = sinon.stub();
  const analytics = sinon.stub();
  const mentions = sinon.stub().resolves();
  const media = sinon.stub().resolves();
  const register = sinon.stub();
  const start = sinon.stub().resolves();
  // Production init returns before its first poll. Poll behavior belongs to
  // the automations tests, not this boot orchestration harness.
  const automations = sinon.stub();
  const reschedule = sinon.stub().resolves();
  const jobsService = { start };
  const genericService = {
    init: async () => {},
    listen() {},
    api: { members: {} },
    handleImportJob() {},
    service: {},
  };
  const scheduler = { run() {}, rescheduleOnBoot };
  const modules: Record<string, unknown> = {
    './server/overrides': {},
    '@tryghost/debug': () => () => {},
    'node:assert/strict': assert,
    './server/services/adapter-manager': { default: { getAdapter: () => scheduler } },
    './server/adapters/scheduling/error-capture': { withErrorCapture: (value: unknown) => value },
    './shared/url-utils': { default: { urlFor: () => 'https://example.com/ghost/api/admin' } },
    './shared/settings-cache': { get: () => 'site-id' },
    './server/services/stripe': { init: stripe },
    './server/services/gifts': {
      init: gifts,
      deliveryService: {},
      service: {},
    },
    './server/services/mentions': {
      init: mentions,
      controller: {},
      sendingService: {},
    },
    './server/services/email-analytics': {
      getGifts: () => ({}),
      getAutomations: () => ({}),
      getNewsletters: () => ({}),
      init: analytics,
    },
    './server/services/media-inliner': {
      init: media,
      getInstance: () => ({}),
    },
    './server/services/post-scheduling': { default: { rescheduleAll: reschedule } },
    './server/services/jobs-service/register-job-handlers': { default: register },
    './server/services/automations': { automationsService: { init: automations } },
  };
  const context = {
    require: (name: string) => modules[name] ?? { ...genericService, default: genericService },
    module: { exports: {} },
  };
  const source = readFileSync(resolve(__dirname, '../../core/boot.js'), 'utf8');
  const initServices = runInNewContext(`${source}\ninitServices;`, context);
  return {
    initServices: (): Promise<void> =>
      initServices({ config: {}, prometheusClient: null, jobsService }),
    stripe,
    gifts,
    mentions,
    analytics,
    media,
    register,
    start,
    automations,
    reschedule,
  };
}

it('initializes dependencies and starts jobs before calling automations init', async function () {
  const boot = createServicesHarness();
  await boot.initServices();

  for (const dependency of [boot.gifts, boot.mentions, boot.analytics, boot.media]) {
    sinon.assert.callOrder(dependency, boot.register);
  }
  sinon.assert.callOrder(boot.register, boot.start, boot.automations, boot.reschedule);
  sinon.assert.calledOnce(boot.automations);
});

it('does not reschedule posts when the scheduling adapter opts out', async function () {
  const boot = createServicesHarness({ rescheduleOnBoot: false });
  await boot.initServices();

  sinon.assert.calledOnce(boot.start);
  sinon.assert.calledOnce(boot.automations);
  sinon.assert.notCalled(boot.reschedule);
});

it('waits for Stripe initialization before initializing gifts and the other services', async function () {
  const boot = createServicesHarness();
  const ready = Promise.withResolvers<void>();
  boot.stripe.returns(ready.promise);
  const startup = boot.initServices();

  try {
    // Drain runnable promise continuations while the dependency stays unresolved.
    await setImmediate();
    sinon.assert.calledOnce(boot.stripe);
    sinon.assert.notCalled(boot.gifts);
    sinon.assert.notCalled(boot.mentions);
    sinon.assert.notCalled(boot.analytics);
    sinon.assert.notCalled(boot.media);
    sinon.assert.notCalled(boot.register);
    sinon.assert.notCalled(boot.start);
  } finally {
    ready.resolve();
    await startup;
  }

  sinon.assert.calledOnce(boot.gifts);
  sinon.assert.calledOnce(boot.register);
  sinon.assert.calledOnce(boot.start);
});

for (const dependency of ['mentions', 'media'] as const) {
  it(`waits for ${dependency} initialization to finish before registering or starting jobs`, async function () {
    const boot = createServicesHarness();
    const ready = Promise.withResolvers<void>();
    boot[dependency].returns(ready.promise);
    const startup = boot.initServices();

    try {
      await setImmediate();
      sinon.assert.calledOnce(boot[dependency]);
      sinon.assert.notCalled(boot.register);
      sinon.assert.notCalled(boot.start);
      sinon.assert.notCalled(boot.automations);
      sinon.assert.notCalled(boot.reschedule);
    } finally {
      ready.resolve();
      await startup;
    }

    sinon.assert.calledOnce(boot.register);
    sinon.assert.calledOnce(boot.start);
    sinon.assert.calledOnce(boot.automations);
    sinon.assert.calledOnce(boot.reschedule);
  });

  it(`propagates the same ${dependency} initialization error without starting dependent work`, async function () {
    const boot = createServicesHarness();
    const failure = new Error(`${dependency} initialization failed`);
    boot[dependency].rejects(failure);

    await assert.rejects(boot.initServices(), (error) => error === failure);

    sinon.assert.notCalled(boot.register);
    sinon.assert.notCalled(boot.start);
    sinon.assert.notCalled(boot.automations);
    sinon.assert.notCalled(boot.reschedule);
  });
}

it('waits for jobs startup to finish before automations init and post rescheduling', async function () {
  const boot = createServicesHarness();
  const ready = Promise.withResolvers<void>();
  boot.start.returns(ready.promise);
  const startup = boot.initServices();

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.register);
    sinon.assert.calledOnce(boot.start);
    sinon.assert.notCalled(boot.automations);
    sinon.assert.notCalled(boot.reschedule);
  } finally {
    ready.resolve();
    await startup;
  }

  sinon.assert.calledOnce(boot.automations);
  sinon.assert.calledOnce(boot.reschedule);
});

it('propagates the same jobs startup error without automations init or post rescheduling', async function () {
  const boot = createServicesHarness();
  const failure = new Error('jobs startup failed');
  boot.start.rejects(failure);

  await assert.rejects(boot.initServices(), (error) => error === failure);

  sinon.assert.calledOnce(boot.register);
  sinon.assert.notCalled(boot.automations);
  sinon.assert.notCalled(boot.reschedule);
});

it('propagates a synchronous automations init error without post rescheduling', async function () {
  const boot = createServicesHarness();
  const failure = new Error('automations init failed');
  boot.automations.throws(failure);

  await assert.rejects(boot.initServices(), (error) => error === failure);

  sinon.assert.calledOnce(boot.start);
  sinon.assert.calledOnce(boot.automations);
  sinon.assert.notCalled(boot.reschedule);
});

it('keeps starting background services when email analytics scheduling fails', async function () {
  const newsletterError = new Error('newsletter backend unavailable');
  const giftError = new Error('gift lookup failed');
  const emailAnalyticsJobs = {
    scheduleRecurringNewslettersJob: sinon.stub().rejects(newsletterError),
    scheduleRecurringAutomationsJob: sinon.stub().resolves(),
    scheduleRecurringGiftDeliveriesJob: sinon.stub().rejects(giftError),
  };
  const logging = { error: sinon.stub() };
  const updateCheck = { scheduleJobs: sinon.stub().resolves() };
  const tinybirdSync = { scheduleJob: sinon.stub().resolves() };
  const milestones = { initAndRun: sinon.stub() };
  const modules: Record<string, unknown> = {
    '@tryghost/debug': () => () => {},
    '@tryghost/logging': logging,
    './server/services/email-analytics/jobs': emailAnalyticsJobs,
    './server/services/themes': { loadInactiveThemes() {} },
    './server/services/email-service': { service: { resumeInterruptedSends: async () => {} } },
    './server/services/gifts': { recoverPendingDeliveries() {} },
    './server/services/gifts/jobs': {
      scheduleGiftCleanupJob: async () => {},
      scheduleGiftReminderJob: async () => {},
    },
    './server/services/members/jobs': {
      scheduleTokenCleanupJob: async () => {},
      scheduleExpiredCompCleanupJob: async () => {},
    },
    './server/services/signing-keys': { scheduleCheckJob: async () => {} },
    './server/services/jobs-service': { getInstance: () => ({}) },
    './server/services/activitypub': { init: async () => {} },
    './server/services/tinybird-sync': tinybirdSync,
    './server/services/update-check': updateCheck,
    './server/services/remote-flags': { init() {} },
    './server/services/milestones': milestones,
  };
  const context = {
    require: (name: string) => modules[name],
    module: { exports: {} },
    process: { env: { NODE_ENV: 'production' } },
  };
  const source = readFileSync(resolve(__dirname, '../../core/boot.js'), 'utf8');
  const initBackgroundServices = runInNewContext(`${source}\ninitBackgroundServices;`, context);
  await initBackgroundServices({ config: { get: () => true } });

  sinon.assert.calledTwice(logging.error);
  sinon.assert.calledWithExactly(logging.error, newsletterError);
  sinon.assert.calledWithExactly(logging.error, giftError);
  sinon.assert.calledOnce(updateCheck.scheduleJobs);
  sinon.assert.calledOnce(tinybirdSync.scheduleJob);
  sinon.assert.calledOnce(milestones.initAndRun);
});
