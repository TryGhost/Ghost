import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { withErrorCapture } from '../../../../../core/server/adapters/scheduling/error-capture';
// @ts-expect-error This module lacks type definitions.
import sentry from '../../../../../core/shared/sentry';
import type { SchedulingAdapter } from '../../../../../core/server/adapters/scheduling/error-capture';

describe('Scheduling Adapter Error Capture', function () {
  const job = {
    time: 1234567890,
    url: 'https://example.com/ghost/api/admin/schedules/posts/abc123/?token=super-secret',
    extra: { httpMethod: 'PUT' },
  };

  let adapter: sinon.SinonStubbedInstance<SchedulingAdapter>;
  let captureException: any;
  let logError: any;

  beforeEach(function () {
    adapter = {
      rescheduleOnBoot: true,
      dedupesByIdempotencyKey: true,
      run: sinon.stub(),
      schedule: sinon.stub(),
      unschedule: sinon.stub(),
      register: sinon.stub(),
      rescheduleAll: sinon.stub().resolves('all-rescheduled') as any,
    };
    captureException = sinon.stub(sentry, 'captureException');
    logError = sinon.stub(logging, 'error');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('reports nothing when the adapter succeeds', async function () {
    await withErrorCapture(adapter).schedule(job);

    sinon.assert.calledOnceWithExactly(adapter.schedule, job);
    sinon.assert.notCalled(captureException);
    sinon.assert.notCalled(logError);
  });

  it('reports and propagates a synchronous throw', async function () {
    const err = new Error('sync boom');
    adapter.schedule.throws(err);

    await assert.rejects(withErrorCapture(adapter).schedule(job), (thrown) => thrown === err);

    sinon.assert.calledOnceWithExactly(adapter.schedule, job);
    sinon.assert.calledOnceWithExactly(captureException, err);
    assert.equal(logError.firstCall.args[0].event.name, 'scheduler.schedule.failed');
  });

  it('reports and propagates a rejected promise', async function () {
    const err = new Error('async boom');
    adapter.unschedule.rejects(err);

    await assert.rejects(
      withErrorCapture(adapter).unschedule(job, { bootstrap: true }),
      (thrown) => thrown === err,
    );

    sinon.assert.calledOnceWithExactly(adapter.unschedule, job, { bootstrap: true });
    sinon.assert.calledOnceWithExactly(captureException, err);
    assert.equal(logError.firstCall.args[0].event.name, 'scheduler.unschedule.failed');
  });

  it('reports and propagates a rejected non-native thenable', async function () {
    const err = new Error('thenable boom');
    adapter.schedule.returns({
      then: (_, onReject) => Promise.resolve().then(() => onReject?.(err)),
    } as Promise<void>);

    await assert.rejects(withErrorCapture(adapter).schedule(job), (thrown) => thrown === err);

    sinon.assert.calledOnceWithExactly(adapter.schedule, job);
    sinon.assert.calledOnceWithExactly(captureException, err);
  });

  it('strips the signed token from the reported url', async function () {
    adapter.schedule.throws(new Error('boom'));

    await assert.rejects(withErrorCapture(adapter).schedule(job), /boom/);

    const logged = logError.firstCall.args[0];
    assert.equal(logged.url, 'https://example.com/ghost/api/admin/schedules/posts/abc123/');
    assert.equal(JSON.stringify(logged).includes('super-secret'), false);
  });

  it('passes non-scheduling members through to the adapter', async function () {
    const wrapped = withErrorCapture(adapter);
    const rescheduler = { rescheduleAll: sinon.stub() };

    wrapped.run();
    wrapped.register(rescheduler);
    const result = await wrapped.rescheduleAll({ previousKey: { id: 'k', secret: 's' } });

    assert.equal(wrapped.rescheduleOnBoot, true);
    assert.equal(wrapped.dedupesByIdempotencyKey, true);
    sinon.assert.calledOnce(adapter.run);
    sinon.assert.calledOnceWithExactly(adapter.register, rescheduler);
    sinon.assert.calledOnceWithExactly(adapter.rescheduleAll, {
      previousKey: { id: 'k', secret: 's' },
    });
    assert.equal(result, 'all-rescheduled');
  });
});
