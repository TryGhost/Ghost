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
    './server/services/email-analytics/jobs': { scheduleRecurringAutomationsJob: schedule },
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
        // The real service schedules analytics from its own jobs module import
        init: async () => {
          order.push('automations');
          await schedule(true);
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
  await initServices({ config: {}, prometheusClient: null, jobsService });
  for (const dependency of ['gifts', 'mentions', 'analytics', 'media']) {
    assert.ok(order.indexOf(dependency) < order.indexOf('register'), dependency);
  }
  assert.ok(order.indexOf('register') < order.indexOf('start'));
  assert.ok(order.indexOf('start') < order.indexOf('automations'));
  assert.ok(order.indexOf('schedule') < order.indexOf('reschedule'));
  sinon.assert.calledOnceWithExactly(schedule, true);
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
    './server/services/jobs-service': { getInstance: () => ({}) },
    './server/services/activitypub': { init: async () => {} },
    './server/services/tinybird-sync': { start() {} },
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
  sinon.assert.calledOnce(milestones.initAndRun);
});
