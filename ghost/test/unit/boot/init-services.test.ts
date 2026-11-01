import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

function createServicesHarness({ rescheduleOnBoot = true } = {}) {
  const stripe = sinon.stub().resolves();
  const emailAddress = sinon.stub();
  // These initializers are synchronous in production.
  const gifts = sinon.stub();
  const analytics = sinon.stub();
  const emailSuppressionList = { init: sinon.stub().resolves() };
  const mentions = sinon.stub().resolves();
  // Recommendations initializes synchronously and reads the mentions fields during its call.
  const recommendations = sinon.stub();
  const media = sinon.stub().resolves();
  const email = sinon.stub().resolves();
  const donations = sinon.stub().resolves();
  const tiers = sinon.stub().resolves();
  const memberAttribution = sinon.stub().resolves();
  // Staff captures the ready attribution service.
  const staff = sinon.stub().resolves();
  const linkTracking = sinon.stub().resolves();
  const memberWelcomeEmails = sinon.stub().resolves();
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
  // Permissive: initServices has many dependencies, and only those listed here matter to these
  // tests. Every other dependency gets a generic service.
  const initServices = loadBootFunction(
    'initServices',
    {
      'node:assert/strict': assert,
      './server/services/adapter-manager': { default: { getAdapter: () => scheduler } },
      './server/adapters/scheduling/error-capture': { withErrorCapture: (value: unknown) => value },
      './shared/url-utils': { default: { urlFor: () => 'https://example.com/ghost/api/admin' } },
      './shared/settings-cache': { get: () => 'site-id' },
      './server/services/stripe': { init: stripe },
      './server/services/email-address': { init: emailAddress },
      './server/services/gifts': {
        init: gifts,
        deliveryService: {},
        service: {},
      },
      './server/services/mentions': {
        default: { init: mentions, service: { controller: {}, sendingService: {} } },
      },
      './server/services/recommendations': { default: { init: recommendations } },
      './server/services/email-analytics': {
        getGifts: () => ({}),
        getAutomations: () => ({}),
        getNewsletters: () => ({}),
        init: analytics,
      },
      './server/services/email-service': { init: email, service: {} },
      './server/services/email-suppression-list': emailSuppressionList,
      './server/services/donations': { default: { init: donations } },
      './server/services/tiers': { default: { init: tiers } },
      './server/services/member-attribution': { default: { init: memberAttribution } },
      './server/services/staff': { default: { init: staff } },
      './server/services/link-tracking': { init: linkTracking },
      './server/services/member-welcome-emails': { default: { init: memberWelcomeEmails } },
      './server/services/media-inliner': { default: { init: media, service: {} } },
      './server/services/post-scheduling': { default: { rescheduleAll: reschedule } },
      './server/services/jobs-service/register-job-handlers': { default: register },
      './server/services/automations': { automationsService: { init: automations } },
    },
    { fallback: () => ({ ...genericService, default: genericService }) },
  );
  return {
    initServices: (): Promise<void> =>
      initServices({ config: {}, prometheusClient: null, jobsService }),
    stripe,
    emailAddress,
    gifts,
    mentions,
    recommendations,
    analytics,
    emailSuppressionList,
    media,
    email,
    donations,
    tiers,
    memberAttribution,
    staff,
    linkTracking,
    memberWelcomeEmails,
    register,
    start,
    automations,
    reschedule,
  };
}

it('initializes email address policy before constructing its dependent services', async function () {
  const boot = createServicesHarness();
  await boot.initServices();

  sinon.assert.calledOnce(boot.emailAddress);
  sinon.assert.callOrder(boot.emailAddress, boot.stripe, boot.gifts, boot.email);
});

it('propagates email address construction failure before initializing dependent services', async function () {
  const boot = createServicesHarness();
  const failure = new Error('email address construction failed');
  boot.emailAddress.throws(failure);

  await assert.rejects(boot.initServices(), (error) => error === failure);

  for (const dependency of [boot.stripe, boot.gifts, boot.email, boot.register, boot.start]) {
    sinon.assert.notCalled(dependency);
  }
});

it('initializes dependencies and starts jobs before calling automations init', async function () {
  const boot = createServicesHarness();
  await boot.initServices();

  for (const dependency of [boot.gifts, boot.mentions, boot.analytics, boot.media, boot.email]) {
    sinon.assert.callOrder(dependency, boot.register);
  }
  sinon.assert.callOrder(boot.register, boot.start, boot.automations, boot.reschedule);
  sinon.assert.calledOnce(boot.automations);
});

it('passes the eager email suppression list to email analytics before calling its init', async function () {
  // Current behaviour: analytics retains the root object itself, captured before
  // the root's init runs later in the same group.
  const boot = createServicesHarness();
  await boot.initServices();

  sinon.assert.calledOnce(boot.analytics);
  assert.equal(boot.analytics.firstCall.args[0].emailSuppressionList, boot.emailSuppressionList);
  sinon.assert.calledOnce(boot.emailSuppressionList.init);
  sinon.assert.callOrder(boot.analytics, boot.emailSuppressionList.init);
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

it('waits for member attribution initialization before initializing staff', async function () {
  const boot = createServicesHarness();
  const ready = Promise.withResolvers<void>();
  boot.memberAttribution.returns(ready.promise);
  const startup = boot.initServices();

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.memberAttribution);
    sinon.assert.notCalled(boot.staff);
    sinon.assert.notCalled(boot.register);
  } finally {
    ready.resolve();
    await startup;
  }

  sinon.assert.calledOnce(boot.staff);
  sinon.assert.callOrder(boot.memberAttribution, boot.staff, boot.register);
});

it('propagates a synchronous recommendations initialization error without starting dependent work', async function () {
  const boot = createServicesHarness();
  const failure = new Error('recommendations initialization failed');
  boot.recommendations.throws(failure);

  await assert.rejects(boot.initServices(), (error) => error === failure);

  sinon.assert.notCalled(boot.register);
  sinon.assert.notCalled(boot.start);
  sinon.assert.notCalled(boot.automations);
  sinon.assert.notCalled(boot.reschedule);
});

it('constructs gifts over the tiers root before tiers initialization starts', async function () {
  const boot = createServicesHarness();

  await boot.initServices();

  sinon.assert.calledOnce(boot.tiers);
  sinon.assert.callOrder(boot.gifts, boot.tiers);
});

it('waits for link tracking before initializing member welcome emails, then initializes it before jobs', async function () {
  const boot = createServicesHarness();
  const ready = Promise.withResolvers<void>();
  boot.linkTracking.returns(ready.promise);
  const startup = boot.initServices();

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.linkTracking);
    sinon.assert.notCalled(boot.memberWelcomeEmails);
    sinon.assert.notCalled(boot.register);
  } finally {
    ready.resolve();
    await startup;
  }

  sinon.assert.calledOnce(boot.memberWelcomeEmails);
  sinon.assert.callOrder(
    boot.emailAddress,
    boot.linkTracking,
    boot.memberWelcomeEmails,
    boot.register,
    boot.automations,
  );
});

for (const dependency of [
  'mentions',
  'media',
  'email',
  'donations',
  'memberWelcomeEmails',
  'tiers',
  'staff',
] as const) {
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

it('waits for mentions initialization to finish before initializing recommendations', async function () {
  // Recommendations reads the ready Mentions instance while it initializes.
  const boot = createServicesHarness();
  const ready = Promise.withResolvers<void>();
  boot.mentions.returns(ready.promise);
  const startup = boot.initServices();

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.mentions);
    sinon.assert.notCalled(boot.recommendations);
  } finally {
    ready.resolve();
    await startup;
  }

  sinon.assert.calledOnce(boot.recommendations);
});

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
