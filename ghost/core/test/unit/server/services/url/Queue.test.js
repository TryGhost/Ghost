const _ = require('lodash');
const should = require('should');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const Queue = require('../../../../../core/server/services/url/Queue');

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

        should.exist(queue.queue.chocolate);
        queue.queue.chocolate.subscribers.length.should.eql(1);

        queue.register({
            event: 'chocolate'
        }, null);

        queue.queue.chocolate.subscribers.length.should.eql(2);

        queue.register({
            event: 'nachos'
        }, null);

        should.exist(queue.queue.chocolate);
        should.exist(queue.queue.nachos);

        queue.queue.chocolate.subscribers.length.should.eql(2);
        queue.queue.nachos.subscribers.length.should.eql(1);

        // events have not been triggered yet
        queue.toNotify.should.eql({});
    });

    describe('fn: start (no tolerance)', function () {
        it('no subscribers', function (done) {
            queue.addListener('ended', function (event) {
                event.should.eql('nachos');
                queueRunSpy.callCount.should.eql(1);
                done();
            });

            queue.start({
                event: 'nachos'
            });
        });

        it('1 subscriber', function (done) {
            let notified = 0;

            queue.addListener('ended', function (event) {
                event.should.eql('nachos');
                queueRunSpy.callCount.should.eql(2);
                notified.should.eql(1);
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
                event.should.eql('nachos');

                // 9 subscribers + start triggers run
                queueRunSpy.callCount.should.eql(10);
                notified.should.eql(9);
                order.should.eql([0, 1, 2, 3, 4, 5, 6, 7, 8]);
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
                event.should.eql('nachos');
                queueRunSpy.callCount.should.eql(1);
                notified.should.eql(0);
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

            logging.error.calledOnce.should.be.true();
            queue.toNotify.nachos.notified.length.should.eql(0);
        });
    });

    describe('fn: start (with tolerance)', function () {
        it('late subscriber', function (done) {
            let notified = 0;

            queue.addListener('ended', function (event) {
                event.should.eql('nachos');
                notified.should.eql(1);
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
                event.should.eql('nachos');
                notified.should.eql(1);
                called.should.eql(1);
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
                event.should.eql('nachos');
                notified.should.eql(0);
                called.should.eql(0);
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
                event.should.eql('nachos');
                notified.should.eql(1);
                called.should.eql(1);
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
