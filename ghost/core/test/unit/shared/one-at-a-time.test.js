// @ts-check
const assert = require('node:assert/strict');
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

    it('returns a promise that resolves when all work is done', async function () {
        const first = Promise.withResolvers();
        const fn = sinon.stub()
            .onFirstCall().returns(first.promise)
            .resolves();
        const run = oneAtATime(fn);

        // idle -> running
        const p1 = run();
        let isP1Resolved = false;
        p1.then(() => {
            isP1Resolved = true;
        });
        await eventLoop();
        assert.equal(isP1Resolved, false);

        // running -> running+queued
        const p2 = run();
        assert.equal(p1, p2, 'concurrent callers receive same promise');
        await eventLoop();
        assert.equal(isP1Resolved, false);

        // running+queued -> running
        first.resolve();
        await Promise.all([p1, p2]);
        assert.equal(isP1Resolved, true);
    });

    it('returns a new promise for each fresh invocation after going idle', async function () {
        const fn = sinon.stub().resolves();
        const run = oneAtATime(fn);

        const p1 = run();
        await p1;
        const p2 = run();

        assert.notEqual(p1, p2);
    });
});
