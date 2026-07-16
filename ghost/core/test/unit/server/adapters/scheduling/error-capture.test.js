const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const sentry = require('../../../../../core/shared/sentry');
const {withErrorCapture} = require('../../../../../core/server/adapters/scheduling/error-capture');

describe('Scheduling Adapter Error Capture', function () {
    const job = {
        time: 1234567890,
        url: 'https://example.com/ghost/api/admin/schedules/posts/abc123/?token=super-secret',
        extra: {httpMethod: 'PUT'}
    };

    let adapter;
    let captureException;
    let logError;

    beforeEach(function () {
        adapter = {
            rescheduleOnBoot: true,
            run: sinon.stub(),
            schedule: sinon.stub(),
            unschedule: sinon.stub(),
            register: sinon.stub(),
            rescheduleAll: sinon.stub().resolves('all-rescheduled')
        };
        captureException = sinon.stub(sentry, 'captureException');
        logError = sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('reports nothing when the adapter succeeds', function () {
        withErrorCapture(adapter).schedule(job);

        assert.equal(adapter.schedule.calledOnceWithExactly(job), true);
        assert.equal(captureException.called, false);
        assert.equal(logError.called, false);
    });

    it('captures a synchronous throw', function () {
        const err = new Error('sync boom');
        adapter.schedule.throws(err);

        withErrorCapture(adapter).schedule(job);

        assert.equal(captureException.calledOnceWithExactly(err), true);
        assert.equal(logError.firstCall.args[0].event.name, 'scheduler.schedule.failed');
    });

    it('captures a rejected promise', async function () {
        const err = new Error('async boom');
        adapter.unschedule.rejects(err);

        withErrorCapture(adapter).unschedule(job, {bootstrap: true});
        await new Promise((resolve) => {
            setImmediate(resolve);
        });

        assert.equal(adapter.unschedule.calledOnceWithExactly(job, {bootstrap: true}), true);
        assert.equal(captureException.calledOnceWithExactly(err), true);
        assert.equal(logError.firstCall.args[0].event.name, 'scheduler.unschedule.failed');
    });

    it('captures a rejected non-native thenable', async function () {
        const err = new Error('thenable boom');
        adapter.schedule.returns({
            then: (onResolve, onReject) => Promise.resolve().then(() => onReject(err))
        });

        withErrorCapture(adapter).schedule(job);
        await new Promise((resolve) => {
            setImmediate(resolve);
        });

        assert.equal(captureException.calledOnceWithExactly(err), true);
    });

    it('does not swallow the failure into an unhandled rejection', async function () {
        const onUnhandled = sinon.stub();
        process.once('unhandledRejection', onUnhandled);
        adapter.schedule.rejects(new Error('async boom'));

        withErrorCapture(adapter).schedule(job);
        await new Promise((resolve) => {
            setImmediate(resolve);
        });

        process.removeListener('unhandledRejection', onUnhandled);
        assert.equal(onUnhandled.called, false);
    });

    it('strips the signed token from the reported url', function () {
        adapter.schedule.throws(new Error('boom'));

        withErrorCapture(adapter).schedule(job);

        const logged = logError.firstCall.args[0];
        assert.equal(logged.url, 'https://example.com/ghost/api/admin/schedules/posts/abc123/');
        assert.equal(JSON.stringify(logged).includes('super-secret'), false);
    });

    it('passes non-scheduling members through to the adapter', async function () {
        const wrapped = withErrorCapture(adapter);
        const rescheduler = {rescheduleAll: sinon.stub()};

        wrapped.run();
        wrapped.register(rescheduler);
        const result = await wrapped.rescheduleAll({previousKey: {id: 'k', secret: 's'}});

        assert.equal(wrapped.rescheduleOnBoot, true);
        assert.equal(adapter.run.calledOnce, true);
        assert.equal(adapter.register.calledOnceWithExactly(rescheduler), true);
        assert.equal(adapter.rescheduleAll.calledOnceWithExactly({previousKey: {id: 'k', secret: 's'}}), true);
        assert.equal(result, 'all-rescheduled');
    });
});
