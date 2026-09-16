import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import sinon from 'sinon';

it('initializes dependencies and starts jobs before automation polling can schedule analytics', async function () {
  const order: string[] = [];
  let started = false;
  const schedule = sinon.stub().callsFake(async () => {
    assert.ok(started, 'analytics scheduling requires a started jobs backend');
    order.push('schedule');
  });
  const emailAnalyticsJobs = {
    scheduleRecurringAutomationsJob: schedule,
    scheduleRecurringGiftDeliveriesJob: sinon.stub(),
  };
  const jobsService = {
    start: async () => {
      order.push('start');
      started = true;
    },
  };
  const genericService = {
    init: async () => {},
    listen() {},
    api: { members: {} },
    handleImportJob() {},
  };
  const scheduler = { run() {}, rescheduleOnBoot: true };
  const modules: Record<string, unknown> = {
    './server/overrides': {},
    '@tryghost/debug': () => () => {},
    'node:assert/strict': assert,
    './server/services/adapter-manager': { default: { getAdapter: () => scheduler } },
    './server/adapters/scheduling/error-capture': { withErrorCapture: (value: unknown) => value },
    './shared/url-utils': { default: { urlFor: () => 'https://example.com/ghost/api/admin' } },
    './shared/settings-cache': { get: () => 'site-id' },
    './server/services/gifts': {
      init: () => {
        order.push('gifts');
      },
      deliveryService: {},
      service: {},
    },
    './server/services/mentions': {
      init: async () => {
        order.push('mentions');
      },
      controller: {},
      sendingService: {},
    },
    './server/services/email-analytics': {
      getNewsletters: () => ({}),
      init: async () => {
        order.push('analytics');
      },
    },
    './server/services/media-inliner': {
      init: async () => {
        order.push('media');
      },
      getInstance: () => ({}),
    },
    './server/services/email-service': {
      init: (options: { emailAnalyticsJobs: unknown }) => {
        assert.equal(options.emailAnalyticsJobs, emailAnalyticsJobs);
      },
    },
    './server/services/post-scheduling': {
      default: {
        rescheduleAll: async () => {
          order.push('reschedule');
        },
      },
    },
    './server/services/jobs-service/register-job-handlers': {
      default: () => {
        order.push('register');
      },
    },
    './server/services/automations': {
      automationsService: {
        init: async ({
          scheduleAutomationEmailAnalyticsJob,
        }: {
          scheduleAutomationEmailAnalyticsJob: () => Promise<void>;
        }) => {
          order.push('automations');
          await scheduleAutomationEmailAnalyticsJob();
        },
      },
    },
  };
  const context = {
    require: (name: string) => modules[name] ?? { ...genericService, default: genericService },
    module: { exports: {} },
  };
  const source = readFileSync(resolve(__dirname, '../../core/boot.js'), 'utf8');
  const initServices = runInNewContext(`${source}\ninitServices;`, context);
  await initServices({ config: {}, prometheusClient: null, jobsService, emailAnalyticsJobs });
  for (const dependency of ['gifts', 'mentions', 'analytics', 'media']) {
    assert.ok(order.indexOf(dependency) < order.indexOf('register'), dependency);
  }
  assert.ok(order.indexOf('register') < order.indexOf('start'));
  assert.ok(order.indexOf('start') < order.indexOf('automations'));
  assert.ok(order.indexOf('schedule') < order.indexOf('reschedule'));
  sinon.assert.calledOnceWithExactly(schedule, true);
});
