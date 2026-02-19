const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const _ = require('lodash');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const Queue = require('../../../../../core/server/services/url/queue');

describe('Unit: services/url/Queue', function () {
    /** @type {Queue} */
    let queue;

    /** @type {sinon.SinonSpy} */
    let queueRunSpy;

    beforeEach(function () {
        queue = new Queue();

        queueRunSpy = sinon.spy(queue, 'run');
        sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('fn: register', function () {
        queue.register({
            event: 'chocolate'
        }, null);

        assertExists(queue.queue.chocolate);
        assert.equal(queue.queue.chocolate.subscribers.length, 1);

        queue.register({
            event: 'chocolate'
        }, null);

        assert.equal(queue.queue.chocolate.subscribers.length, 2);

        queue.register({
            event: 'nachos'
        }, null);

        assertExists(queue.queue.chocolate);
        assertExists(queue.queue.nachos);

        assert.equal(queue.queue.chocolate.subscribers.length, 2);
        assert.equal(queue.queue.nachos.subscribers.length, 1);

        // events have not been triggered yet
        assert.deepEqual(queue.toNotify, {});
    });

    describe('fn: start (no tolerance)', function () {
        it('no subscribers', function (done) {
            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');
                assert.equal(queueRunSpy.callCount, 1);
                done();
            });

            queue.start({
                event: 'nachos'
            });
        });

        it('1 subscriber', function (done) {
            let notified = 0;

            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');
                assert.equal(queueRunSpy.callCount, 2);
                assert.equal(notified, 1);
                done();
            });

            queue.register({
                event: 'nachos'
            }, function () {
                notified = notified + 1;
            });

            queue.start({
                event: 'nachos'
            });
        });

        it('x subscriber', function (done) {
            let notified = 0;
            let order = [];

            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');

                // 9 subscribers + start triggers run
                assert.equal(queueRunSpy.callCount, 10);
                assert.equal(notified, 9);
                assert.deepEqual(order, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
                done();
            });

            _.each(_.range(9), function (i) {
                queue.register({
                    event: 'nachos'
                }, function () {
                    order.push(i);
                    notified = notified + 1;
                });
            });

            queue.start({
                event: 'nachos'
            });
        });

        it('late subscriber', function (done) {
            let notified = 0;

            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');
                assert.equal(queueRunSpy.callCount, 1);
                assert.equal(notified, 0);
                done();
            });

            queue.start({
                event: 'nachos'
            });

            queue.register({
                event: 'nachos'
            }, function () {
                notified = notified + 1;
            });
        });

        it('subscriber throws error', function () {
            queue.register({
                event: 'nachos'
            }, function () {
                throw new Error('oops');
            });

            queue.start({
                event: 'nachos'
            });

            assert.equal(logging.error.calledOnce, true);
            assert.equal(queue.toNotify.nachos.notified.length, 0);
        });
    });

    describe('fn: start (with tolerance)', function () {
        it('late subscriber', function (done) {
            let notified = 0;

            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');
                assert.equal(notified, 1);
                done();
            });

            queue.start({
                event: 'nachos',
                tolerance: 20,
                timeoutInMS: 20
            });

            queue.register({
                event: 'nachos',
                tolerance: 20
            }, function () {
                notified = notified + 1;
            });
        });

        it('start twice with subscriber between starts', function (done) {
            let notified = 0;
            let called = 0;

            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');
                assert.equal(notified, 1);
                assert.equal(called, 1);
                done();
            });

            queue.start({
                event: 'nachos',
                tolerance: 20,
                timeoutInMS: 20
            });

            queue.register({
                event: 'nachos',
                tolerance: 70
            }, function () {
                if (called !== 0) {
                    return done(new Error('Should only be triggered once.'));
                }

                called = called + 1;
                notified = notified + 1;
            });

            queue.start({
                event: 'nachos',
                tolerance: 20,
                timeoutInMS: 20
            });
        });

        it('start twice', function (done) {
            let notified = 0;
            let called = 0;

            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');
                assert.equal(notified, 0);
                assert.equal(called, 0);
                done();
            });

            queue.start({
                event: 'nachos',
                tolerance: 20,
                timeoutInMS: 20
            });

            queue.start({
                event: 'nachos',
                tolerance: 20,
                timeoutInMS: 20
            });
        });

        it('late subscribers', function (done) {
            let notified = 0;
            let called = 0;

            queue.addListener('ended', function (event) {
                assert.equal(event, 'nachos');
                assert.equal(notified, 1);
                assert.equal(called, 1);
                done();
            });

            setTimeout(function () {
                queue.register({
                    event: 'nachos',
                    tolerance: 100,
                    requiredSubscriberCount: 1
                }, function () {
                    called = called + 1;
                    notified = notified + 1;
                });
            }, 500);

            queue.start({
                event: 'nachos',
                tolerance: 60,
                timeoutInMS: 20,
                requiredSubscriberCount: 1
            });
        });
    });
});
