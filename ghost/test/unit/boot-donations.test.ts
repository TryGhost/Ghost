import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import sinon from 'sinon';

function createServicesHarness() {
  const donations = { init: sinon.stub().resolves() };
  const register = sinon.stub();
  const start = sinon.stub().resolves();
  const automations = { init: sinon.stub().resolves() };
  const reschedule = sinon.stub().resolves();
  const service = { init: async () => {} };
  const scheduler = { run() {}, rescheduleOnBoot: true };
  const jobsService = { start };
  const modules: Record<string, unknown> = {
    './server/overrides': {},
    '@tryghost/debug': () => () => {},
    'node:assert/strict': assert,
    '@tryghost/domain-events': {},
    '@tryghost/metrics': {},
    './server/data/db': {},
    './server/models': {},
    './shared/url-utils': { default: { urlFor: () => 'https://example.com/ghost/api/admin' } },
    './shared/settings-cache': { get: () => 'site-id' },
    './server/services/adapter-manager': { default: { getAdapter: () => scheduler } },
    './server/adapters/scheduling/error-capture': { withErrorCapture: (value: unknown) => value },
    './server/services/donations': donations,
    './server/services/stripe': service,
    './server/services/identity-tokens': service,
    './server/services/members': { ...service, api: { members: {} }, handleImportJob() {} },
    './server/services/tiers': service,
    './server/services/permissions': service,
    './server/services/indexnow-ping': { default: service },
    './server/services/slack-ping': { default: service },
    './server/services/webhooks': { listen() {} },
    './server/services/post-scheduling': { default: { rescheduleAll: reschedule } },
    './server/services/comments': service,
    './server/services/staff': service,
    './server/services/member-attribution': service,
    './server/services/members-events': service,
    './server/services/link-tracking': service,
    './server/services/audience-feedback': service,
    './server/services/email-suppression-list': service,
    './server/services/email-service': { ...service, service: {} },
    './server/services/email-analytics': {
      ...service,
      getGifts: () => ({}),
      getAutomations: () => ({}),
      getNewsletters: () => ({}),
    },
    './server/services/mentions': { ...service, controller: {}, sendingService: {} },
    './server/services/tags-public': service,
    './server/services/posts-public': service,
    './server/services/slack-notifications': service,
    './server/services/media-inliner': { ...service, getInstance: () => ({}) },
    './server/services/content-import': service,
    './server/services/gifts': { init() {}, deliveryService: {}, service: {} },
    './server/services/machine-payments': service,
    './server/services/recommendations': service,
    './server/services/email-address': service,
    './server/services/stats': service,
    './server/services/explore-ping': service,
    './server/services/automations': { automationsService: automations },
    './server/services/automations/automations-api': {},
    './server/services/internal-keys': { default: {} },
    './server/services/jobs-service/register-job-handlers': { default: register },
    './server/services/members/jobs': service,
    './server/services/tinybird-sync': {},
    './server/data/importer': { init: () => ({}) },
  };
  const source = readFileSync(resolve(__dirname, '../../core/boot.js'), 'utf8');
  const initServices = runInNewContext(`${source}\ninitServices;`, {
    require(name: string) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected boot dependency: ${name}`);
      return modules[name];
    },
    module: { exports: {} },
  });
  return {
    init: (): Promise<void> => initServices({ config: {}, prometheusClient: null, jobsService }),
    donations,
    register,
    start,
    automations,
    reschedule,
  };
}

it('waits for Donations initialization before registering or starting jobs', async function () {
  const boot = createServicesHarness();
  const ready = Promise.withResolvers<void>();
  boot.donations.init.returns(ready.promise);
  let completed = false;
  const startup = boot.init().then(() => {
    completed = true;
  });

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.donations.init);
    sinon.assert.notCalled(boot.register);
    sinon.assert.notCalled(boot.start);
    sinon.assert.notCalled(boot.automations.init);
    sinon.assert.notCalled(boot.reschedule);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await Promise.allSettled([startup]);
  }
  await startup;

  sinon.assert.calledOnce(boot.register);
  sinon.assert.calledOnce(boot.start);
  sinon.assert.calledOnce(boot.automations.init);
  sinon.assert.calledOnce(boot.reschedule);
  assert.equal(completed, true);
});

it('propagates the original Donations initialization error without starting dependent work', async function () {
  const boot = createServicesHarness();
  const failure = new Error('Donations initialization failed');
  boot.donations.init.rejects(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  sinon.assert.calledOnce(boot.donations.init);
  sinon.assert.notCalled(boot.register);
  sinon.assert.notCalled(boot.start);
  sinon.assert.notCalled(boot.automations.init);
  sinon.assert.notCalled(boot.reschedule);
});
