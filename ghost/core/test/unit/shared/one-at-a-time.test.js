// @ts-check
const sinon = require('sinon');
const {oneAtATime} = require('../../../core/shared/one-at-a-time');

/**
 * Ponyfill of `Promise.withResolvers`.
 *
 * @template T
 * @returns {{
 *     promise: Promise<T>;
 *     resolve: (value: T) => void;
 *     reject: (err: unknown) => void;
 * }}
 */
const promiseWithResolvers = () => {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
};

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
        const first = promiseWithResolvers();
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

    it('only enqueues, at most, one additional call', async function () {
        const first = promiseWithResolvers();
        const second = promiseWithResolvers();
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
        const first = promiseWithResolvers();
        const second = promiseWithResolvers();
        const fn = sinon.stub()
            .onFirstCall().returns(first.promise)
            .onSecondCall().returns(second.promise);
        const run = oneAtATime(fn);

        // idle -> running
        run();
        sinon.assert.calledOnce(fn);

        // running -> running+queued
        run();

        // running+queued -> running
        first.reject(new Error('failure'));
        await eventLoop();
        sinon.assert.calledTwice(fn);

        // running -> idle
        second.reject(new Error('failure'));
        await eventLoop();
    });
});
