const assert = require('assert');
const AsyncEventEmitter = require('../lib/AsyncEventEmitter');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

const sleep = ms => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

describe('AsyncEventEmitter', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('removeAllListeners', function () {
        it('works without listeners', function () {
            const ee = new AsyncEventEmitter();
            ee.removeAllListeners();
        });

        it('works without listeners with name', function () {
            const ee = new AsyncEventEmitter();
            ee.removeAllListeners('test');
        });

        it('works with listeners', async function () {
            const ee = new AsyncEventEmitter();
            let called = false;
            ee.on('test', () => {
                called = true;
            });
            ee.removeAllListeners();
            await ee.emit('test');
            assert(!called);
        });

        it('works with listeners with name', async function () {
            const ee = new AsyncEventEmitter();
            let called = false;
            ee.on('test', () => {
                called = true;
            });
            ee.removeAllListeners('test');
            await ee.emit('test');
            assert(!called);
        });

        it('works with listeners with other name', async function () {
            const ee = new AsyncEventEmitter();
            let called = false;
            ee.on('test', () => {
                called = true;
            });
            ee.removeAllListeners('test2');
            await ee.emit('test');
            assert(called);
        });
    });

    describe('emit', function () {
        it('catches errors in listeners', async function () {
            const ee = new AsyncEventEmitter();
            const stub = sinon.stub(logging, 'error').returns();
            let called = 0;
            ee.on('test', () => {
                called += 1;
                throw new Error('Test error');
            });
            ee.on('test', async () => {
                // success
                await sleep(5);
                called += 1;
            });
            ee.on('test', async () => {
                await sleep(5);
                called += 1;
                throw new Error('Test error');
            });
            ee.on('test', () => {
                called += 1;
                // success
            });
            await ee.emit('test');
            assert.equal(called, 4);
            assert.equal(stub.callCount, 4);
        });

        it('catches errors outside listeners', async function () {
            const ee = new AsyncEventEmitter();
            ee.listeners = null;
            const stub = sinon.stub(logging, 'error').returns();
            await ee.emit('test');
            assert.equal(stub.callCount, 2);
        });
    });

    describe('listenerCount', function () {
        it('works without listeners', async function () {
            const ee = new AsyncEventEmitter();
            assert.equal(ee.listenerCount('test'), 0);
        });
        it('works with listeners', async function () {
            const ee = new AsyncEventEmitter();
            ee.on('test', () => {});
            ee.on('test', () => {});
            ee.on('test2', () => {});
            ee.on('test', () => {});
            assert.equal(ee.listenerCount('test'), 3);
        });
    });
});
