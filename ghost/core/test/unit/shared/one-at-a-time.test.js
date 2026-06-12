// @ts-check
const assert = require('assert/strict');
const sinon = require('sinon');
const {oneAtATime} = require('../../../core/shared/one-at-a-time');

/**
 * A helper function to give the event loop a little time.
 */
const eventLoop = () => Promise.resolve();

describe('oneAtATime', function () {
    it('calls function immediately when idle', async function () {
        const fn = sinon.stub().resolves();
        const run = oneAtATime(fn);
        sinon.assert.notCalled(fn);

        // idle -> running
        run();
        sinon.assert.calledOnce(fn);

        // running -> idle
        await eventLoop();

        // idle -> running
        run();
        sinon.assert.calledTwice(fn);
    });

    it('enqueues a second call while the first is still running', async function () {
        const first = Promise.withResolvers();
        const fn = sinon.stub()
            .onFirstCall().returns(first.promise)
            .resolves();
        const run = oneAtATime(fn);
        sinon.assert.notCalled(fn);

        // idle -> running
        run();
        sinon.assert.calledOnce(fn);

        // running -> running+queued
        run();
        sinon.assert.calledOnce(fn);

        // running+queued -> running
        first.resolve();
        await eventLoop();
        sinon.assert.calledTwice(fn);
    });

    it('returns a promise that settles after the running invocation completes', async function () {
        const first = Promise.withResolvers();
        const fn = sinon.stub().returns(first.promise);
        const run = oneAtATime(fn);
        const settled = sinon.stub();

        const promise = run();
        promise.then(settled);

        await eventLoop();
        sinon.assert.notCalled(settled);

        first.resolve();
        await promise;
        sinon.assert.calledOnce(settled);
    });

    it('returns a promise that settles after a queued invocation completes', async function () {
        const first = Promise.withResolvers();
        const second = Promise.withResolvers();
        const fn = sinon.stub()
            .onFirstCall().returns(first.promise)
            .onSecondCall().returns(second.promise);
        const run = oneAtATime(fn);
        const settled = sinon.stub();

        run();
        const promise = run();
        const coalescedPromise = run();
        promise.then(settled);

        assert.equal(coalescedPromise, promise);

        first.resolve();
        await eventLoop();
        sinon.assert.calledTwice(fn);
        sinon.assert.notCalled(settled);

        second.resolve();
        await promise;
        sinon.assert.calledOnce(settled);
        sinon.assert.calledTwice(fn);
    });

    it('settles a queued promise without waiting for a later queued invocation', async function () {
        const first = Promise.withResolvers();
        const second = Promise.withResolvers();
        const third = Promise.withResolvers();
        const fn = sinon.stub()
            .onFirstCall().returns(first.promise)
            .onSecondCall().returns(second.promise)
            .onThirdCall().returns(third.promise);
        const run = oneAtATime(fn);
        const secondSettled = sinon.stub();

        run();
        const secondPromise = run();
        secondPromise.then(secondSettled);

        first.resolve();
        await eventLoop();
        sinon.assert.calledTwice(fn);

        const thirdPromise = run();
        second.resolve();
        await secondPromise;
        sinon.assert.calledOnce(secondSettled);
        sinon.assert.calledThrice(fn);

        third.resolve();
        await thirdPromise;
    });

    it('only enqueues, at most, one additional call', async function () {
        const first = Promise.withResolvers();
        const second = Promise.withResolvers();
        const fn = sinon.stub()
            .onFirstCall().returns(first.promise)
            .onSecondCall().returns(second.promise)
            .resolves();
        const run = oneAtATime(fn);
        sinon.assert.notCalled(fn);

        // idle -> running
        run();
        sinon.assert.calledOnce(fn);

        // running -> running+queued
        run();
        run();
        run();
        run();
        sinon.assert.calledOnce(fn);

        // running+queued -> running
        first.resolve();
        await eventLoop();
        sinon.assert.calledTwice(fn);

        // running -> running+queued
        run();
        sinon.assert.calledTwice(fn);

        // running+queued -> running
        second.resolve();
        await eventLoop();
        sinon.assert.calledThrice(fn);
    });

    it('ignores all errors', async function () {
        const first = Promise.withResolvers();
        const second = Promise.withResolvers();
        const fn = sinon.stub()
            .onFirstCall().returns(first.promise)
            .onSecondCall().returns(second.promise);
        const run = oneAtATime(fn);
        const firstSettled = sinon.stub();
        const secondSettled = sinon.stub();

        // idle -> running
        const firstPromise = run();
        firstPromise.then(firstSettled);
        sinon.assert.calledOnce(fn);

        // running -> running+queued
        const secondPromise = run();
        secondPromise.then(secondSettled);

        // running+queued -> running
        first.reject(new Error('failure'));
        await firstPromise;
        sinon.assert.calledOnce(firstSettled);
        sinon.assert.calledTwice(fn);

        // running -> idle
        second.reject(new Error('failure'));
        await secondPromise;
        sinon.assert.calledOnce(secondSettled);
    });
});
