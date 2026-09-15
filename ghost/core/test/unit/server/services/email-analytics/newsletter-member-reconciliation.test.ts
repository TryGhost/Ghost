import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import type {
  JobsBackendBase,
  JobEnvelope,
  JobsStartOptions,
  RecurringSchedule,
  JobRouting,
} from '@tryghost/adapter-base-jobs';
import { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';
import InMemoryJobsBackend from '../../../../../core/server/adapters/jobs/InMemoryJobsBackend';
import { deferred } from '../../../../utils/deferred';
import {
  NewsletterMemberReconciliation,
  ReconcileNewsletterMembersJob,
  resolveReconciliationSettings,
} from '../../../../../core/server/services/email-analytics/newsletter-member-reconciliation';

class Backend implements JobsBackendBase {
  readonly requiredFns = ['start', 'enqueue', 'scheduleRecurring', 'shutdown'] as const;
  options?: JobsStartOptions;
  recurring?: { envelope: JobEnvelope; schedule: RecurringSchedule; routing?: JobRouting };
  start(options: JobsStartOptions) {
    this.options = options;
  }
  enqueue() {}
  shutdown() {}
  scheduleRecurring(envelope: JobEnvelope, schedule: RecurringSchedule, routing?: JobRouting) {
    this.recurring = { envelope, schedule, routing };
  }
}

const quiet = { info() {}, error() {} };

function configured(
  counters: Pick<NewsletterMemberReconciliation, never> & { runSweepPage: sinon.SinonStub },
  settings: { batchSize?: unknown; pauseHours?: unknown } = {},
  enabled = true,
) {
  const reconciliation = new NewsletterMemberReconciliation();
  reconciliation.configure({ counters, enabled, settings });
  return reconciliation;
}

describe('Newsletter member reconciliation', () => {
  afterEach(() => sinon.restore());

  it.each([
    { batchSize: 0 },
    { batchSize: 5001 },
    { batchSize: 1.5 },
    { pauseHours: -1 },
    { pauseHours: Infinity },
  ])('keeps scheduled repair off for unusable settings instead of throwing: %j', (invalid) => {
    const warn = sinon.stub(logging, 'warn');
    assert.equal(resolveReconciliationSettings(invalid), null);
    sinon.assert.calledWithMatch(warn, /unusable member reconciliation settings/);
    const reconciliation = configured({ runSweepPage: sinon.stub() }, invalid);
    assert.equal(reconciliation.enabled, false);
  });

  it('defaults to full pages and a six hour pause', () => {
    assert.deepEqual(resolveReconciliationSettings({}), { batchSize: 5000, pauseHours: 6 });
    assert.deepEqual(resolveReconciliationSettings({ batchSize: null, pauseHours: undefined }), {
      batchSize: 5000,
      pauseHours: 6,
    });
  });

  it('stays off without counters even when asked to enable', () => {
    const reconciliation = new NewsletterMemberReconciliation();
    reconciliation.configure({ counters: null, enabled: true, settings: {} });
    assert.equal(reconciliation.enabled, false);
  });

  it('does not schedule or execute old queued work when disabled', async () => {
    const backend = new Backend();
    const jobs = new JobsService({ backend, logging: quiet });
    const counters = { runSweepPage: sinon.stub() };
    const reconciliation = configured(counters, {}, false);
    reconciliation.register(jobs);
    await jobs.start();
    await reconciliation.schedule(jobs);
    assert.equal(backend.recurring, undefined);
    await backend.options!.processor({ type: ReconcileNewsletterMembersJob.type, payload: '{}' });
    sinon.assert.notCalled(counters.runSweepPage);
  });

  it('propagates a failed page and retries the persisted sweep on the next delivery', async () => {
    const clock = sinon.useFakeTimers({ now: new Date('2030-01-01T00:00:00Z'), toFake: ['Date'] });
    const backend = new Backend();
    const jobs = new JobsService({ backend, logging: quiet });
    const counters = { runSweepPage: sinon.stub() };
    counters.runSweepPage.onFirstCall().rejects(new Error('failed sweep page'));
    counters.runSweepPage
      .onSecondCall()
      .resolves({ processed: 1, complete: false, afterId: 'member-1' });
    const reconciliation = configured(counters);
    reconciliation.register(jobs);
    await jobs.start();
    await reconciliation.schedule(jobs);
    await assert.rejects(
      backend.options!.processor(backend.recurring!.envelope),
      /failed sweep page/,
    );
    // The next scheduled delivery, one interval later, retries the page
    clock.tick(5 * 60 * 1000);
    await backend.options!.processor(backend.recurring!.envelope);
    sinon.assert.calledTwice(counters.runSweepPage);
    assert.deepEqual(counters.runSweepPage.firstCall.args, counters.runSweepPage.secondCall.args);
  });

  it('skips ticks that queued behind a long page instead of running pages back to back', async () => {
    const clock = sinon.useFakeTimers({ now: new Date('2030-01-01T00:00:00Z'), toFake: ['Date'] });
    const info = sinon.stub(logging, 'info');
    const jobs = new JobsService({ backend: new InMemoryJobsBackend(), logging: quiet });
    const started = deferred();
    const release = deferred();
    const skipped = deferred();
    let skips = 0;
    info.withArgs(sinon.match(/Skipping member reconciliation tick/)).callsFake(() => {
      skips += 1;
      if (skips === 2) {
        skipped.done();
      }
    });
    const counters = {
      runSweepPage: sinon.stub().callsFake(async () => {
        started.done();
        await release.promise;
        return { processed: 1, complete: false, afterId: 'member-1' };
      }),
    };
    const reconciliation = configured(counters);
    reconciliation.register(jobs);
    await jobs.start();
    try {
      // A slow page: two more ticks arrive and queue behind it in the single lane
      await jobs.dispatch(new ReconcileNewsletterMembersJob());
      await started.promise;
      await jobs.dispatch(new ReconcileNewsletterMembersJob());
      await jobs.dispatch(new ReconcileNewsletterMembersJob());
      clock.tick(7 * 60 * 1000);
      release.done();
      // Both queued deliveries run once the page ends and are skipped by the
      // handler itself, within a minute of the page's end
      await skipped.promise;
      await jobs.shutdown();
      sinon.assert.calledOnce(counters.runSweepPage);

      // The next real interval runs again
      const again = new JobsService({ backend: new InMemoryJobsBackend(), logging: quiet });
      reconciliation.register(again);
      await again.start();
      clock.tick(5 * 60 * 1000);
      counters.runSweepPage.resolves({ processed: 1, complete: false, afterId: 'member-2' });
      await again.dispatch(new ReconcileNewsletterMembersJob());
      await again.shutdown();
      sinon.assert.calledTwice(counters.runSweepPage);
    } finally {
      release.done();
      clock.restore();
    }
  });

  it('skips a tick that arrives sooner than an interval after a quick page', async () => {
    const clock = sinon.useFakeTimers({ now: new Date('2030-01-01T00:00:00Z'), toFake: ['Date'] });
    const backend = new Backend();
    const jobs = new JobsService({ backend, logging: quiet });
    const counters = {
      runSweepPage: sinon.stub().resolves({ processed: 1, complete: false, afterId: 'member-1' }),
    };
    const reconciliation = configured(counters);
    reconciliation.register(jobs);
    await jobs.start();
    await reconciliation.schedule(jobs);
    const deliver = () => backend.options!.processor(backend.recurring!.envelope);
    await deliver();
    // A page that finished long enough ago still keeps the schedule's spacing
    clock.tick(2 * 60 * 1000);
    await deliver();
    sinon.assert.calledOnce(counters.runSweepPage);
    clock.tick(3 * 60 * 1000);
    await deliver();
    sinon.assert.calledTwice(counters.runSweepPage);
  });

  it('rounds a fractional pause to whole milliseconds for the sweep', async () => {
    const jobs = new JobsService({ backend: new InMemoryJobsBackend(), logging: quiet });
    const counters = {
      runSweepPage: sinon.stub().resolves({ processed: 0, complete: true, afterId: undefined }),
    };
    const reconciliation = configured(counters, { pauseHours: 1 / 3 });
    reconciliation.register(jobs);
    await jobs.start();
    await jobs.dispatch(new ReconcileNewsletterMembersJob());
    await jobs.shutdown();
    sinon.assert.calledOnce(counters.runSweepPage);
    assert.equal(
      Number.isSafeInteger(counters.runSweepPage.firstCall.args[0].startAnotherAfterMs),
      true,
    );
    assert.equal(counters.runSweepPage.firstCall.args[0].startAnotherAfterMs, 1200000);
  });

  it('does not report a paused checkpoint as progress', async () => {
    const backend = new Backend();
    const jobs = new JobsService({ backend, logging: quiet });
    const counters = {
      runSweepPage: sinon.stub().resolves({
        processed: 3,
        complete: true,
        afterId: 'member-3',
        paused: true,
      }),
    };
    const reconciliation = configured(counters);
    reconciliation.register(jobs);
    await jobs.start();
    await reconciliation.schedule(jobs);
    const info = sinon.stub(logging, 'info');
    await backend.options!.processor(backend.recurring!.envelope);
    sinon.assert.neverCalledWithMatch(info, sinon.match.has('system'));
  });

  it('lets the jobs service drain an in-flight member page during shutdown', async () => {
    const jobs = new JobsService({ backend: new InMemoryJobsBackend(), logging: quiet });
    const started = deferred();
    const release = deferred();
    const counters = {
      runSweepPage: sinon.stub().callsFake(async () => {
        started.done();
        await release.promise;
        return { processed: 1, complete: false, afterId: 'member-1' };
      }),
    };
    const reconciliation = configured(counters);
    reconciliation.register(jobs);
    await jobs.start();
    try {
      await jobs.dispatch(new ReconcileNewsletterMembersJob());
      await started.promise;
      let drained = false;
      const shutdown = jobs.shutdown().then(() => {
        drained = true;
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.equal(drained, false);
      release.done();
      await shutdown;
      assert.equal(drained, true);
      sinon.assert.calledOnce(counters.runSweepPage);
    } finally {
      release.done();
      await jobs.shutdown();
    }
  });

  it('schedules bounded sweep work in its own single-worker queue', async () => {
    const backend = new Backend();
    const jobs = new JobsService({ backend, logging: quiet });
    const counters = {
      runSweepPage: sinon.stub().resolves({ processed: 2, complete: false, afterId: 'member-2' }),
    };
    const reconciliation = configured(counters, { batchSize: 2, pauseHours: 6 });
    reconciliation.register(jobs);
    await jobs.start();
    await reconciliation.schedule(jobs);
    assert.ok(backend.recurring);
    assert.deepEqual(backend.recurring.routing, { queue: 'newsletter-member-reconciliation' });
    assert.deepEqual(backend.options?.queues, {
      'newsletter-member-reconciliation': { concurrency: 1 },
    });
    assert.match(backend.recurring.schedule.cron, /^\d+ [0-4]\/5 \* \* \* \*$/);
    await backend.options!.processor(backend.recurring.envelope);
    sinon.assert.calledOnceWithExactly(counters.runSweepPage, {
      limit: 2,
      startAnotherAfterMs: 6 * 60 * 60 * 1000,
    });
  });
});
