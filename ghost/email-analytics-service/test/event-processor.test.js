// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const sinon = require('sinon');

const {EventProcessor} = require('..');

class CustomEventProcessor extends EventProcessor {
    constructor() {
        super(...arguments);

        this.getEmailId = sinon.fake.resolves('emailId');
        this.getMemberId = sinon.fake.resolves('memberId');

        this.handleDelivered = sinon.fake.resolves(true);
        this.handleOpened = sinon.fake.resolves(true);
        this.handleTemporaryFailed = sinon.fake.resolves(true);
        this.handlePermanentFailed = sinon.fake.resolves(true);
        this.handleUnsubscribed = sinon.fake.resolves(true);
        this.handleComplained = sinon.fake.resolves(true);
    }
}

describe('EventProcessor', function () {
    let eventProcessor;

    beforeEach(function () {
        eventProcessor = new CustomEventProcessor();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('delivered', function () {
        it('works', async function () {
            const result = await eventProcessor.process({
                type: 'delivered'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.true();
            eventProcessor.handleDelivered.calledOnce.should.be.true();

            result.should.deepEqual({
                delivered: 1,
                emailIds: ['emailId'],
                memberIds: ['memberId']
            });
        });

        it('gets emailId and memberId directly from event if available', async function () {
            const result = await eventProcessor.process({
                type: 'delivered',
                emailId: 'testEmailId',
                memberId: 'testMemberId'
            });

            eventProcessor.getEmailId.called.should.be.false();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handleDelivered.calledOnce.should.be.true();

            result.should.deepEqual({
                delivered: 1,
                emailIds: ['testEmailId'],
                memberIds: ['testMemberId']
            });
        });

        it('does not process if email id is not found', async function () {
            sinon.replace(eventProcessor, 'getEmailId', sinon.fake.resolves(null));

            const result = await eventProcessor.process({
                type: 'delivered'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.false();
            eventProcessor.handleDelivered.calledOnce.should.be.false();

            result.should.deepEqual({
                unprocessable: 1
            });
        });

        it('does not process if handleDelivered is not overridden', async function () {
            // test non-extended superclass instance
            eventProcessor = new EventProcessor();

            const result = await eventProcessor.process({
                type: 'delivered',
                emailId: 'testEmailId',
                memberId: 'testMemberId'
            });

            result.should.deepEqual({
                unprocessable: 1
            });
        });
    });

    describe('opened', function () {
        it('works', async function () {
            const result = await eventProcessor.process({
                type: 'opened'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.true();
            eventProcessor.handleOpened.calledOnce.should.be.true();

            result.should.deepEqual({
                opened: 1,
                emailIds: ['emailId'],
                memberIds: ['memberId']
            });
        });

        it('gets emailId and memberId directly from event if available', async function () {
            const result = await eventProcessor.process({
                type: 'opened',
                emailId: 'testEmailId',
                memberId: 'testMemberId'
            });

            eventProcessor.getEmailId.called.should.be.false();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handleOpened.calledOnce.should.be.true();

            result.should.deepEqual({
                opened: 1,
                emailIds: ['testEmailId'],
                memberIds: ['testMemberId']
            });
        });

        it('does not process if email id is not found', async function () {
            sinon.replace(eventProcessor, 'getEmailId', sinon.fake.resolves(null));

            const result = await eventProcessor.process({
                type: 'opened'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.false();
            eventProcessor.handleOpened.calledOnce.should.be.false();

            result.should.deepEqual({
                unprocessable: 1
            });
        });

        it('does not process if handleOpened is not overridden', async function () {
            // test non-extended superclass instance
            eventProcessor = new EventProcessor();

            const result = await eventProcessor.process({
                type: 'opened',
                emailId: 'testEmailId',
                memberId: 'testMemberId'
            });

            result.should.deepEqual({
                unprocessable: 1
            });
        });
    });

    describe('failed - permanent', function () {
        it('works', async function () {
            const result = await eventProcessor.process({
                type: 'failed',
                severity: 'permanent'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handlePermanentFailed.calledOnce.should.be.true();

            result.should.deepEqual({
                permanentFailed: 1,
                emailIds: ['emailId']
            });
        });

        it('gets emailId directly from event if available', async function () {
            const result = await eventProcessor.process({
                type: 'failed',
                severity: 'permanent',
                emailId: 'testEmailId'
            });

            eventProcessor.getEmailId.called.should.be.false();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handlePermanentFailed.calledOnce.should.be.true();

            result.should.deepEqual({
                permanentFailed: 1,
                emailIds: ['testEmailId']
            });
        });

        it('does not process if email id is not found', async function () {
            sinon.replace(eventProcessor, 'getEmailId', sinon.fake.resolves(null));

            const result = await eventProcessor.process({
                type: 'failed',
                severity: 'permanent'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handlePermanentFailed.calledOnce.should.be.false();

            result.should.deepEqual({
                unprocessable: 1
            });
        });

        it('does not process if handlePermanentFailed is not overridden', async function () {
            // test non-extended superclass instance
            eventProcessor = new EventProcessor();

            const result = await eventProcessor.process({
                type: 'opened',
                severity: 'permanent',
                emailId: 'testEmailId'
            });

            result.should.deepEqual({
                unprocessable: 1
            });
        });
    });

    describe('failed - temporary', function () {
        it('works', async function () {
            const result = await eventProcessor.process({
                type: 'failed',
                severity: 'temporary'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handleTemporaryFailed.calledOnce.should.be.true();

            result.should.deepEqual({
                temporaryFailed: 1,
                emailIds: ['emailId']
            });
        });

        it('gets emailId directly from event if available', async function () {
            const result = await eventProcessor.process({
                type: 'failed',
                severity: 'temporary',
                emailId: 'testEmailId'
            });

            eventProcessor.getEmailId.called.should.be.false();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handleTemporaryFailed.calledOnce.should.be.true();

            result.should.deepEqual({
                temporaryFailed: 1,
                emailIds: ['testEmailId']
            });
        });

        it('does not process if email id is not found', async function () {
            sinon.replace(eventProcessor, 'getEmailId', sinon.fake.resolves(null));

            const result = await eventProcessor.process({
                type: 'failed',
                severity: 'temporary'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handleTemporaryFailed.calledOnce.should.be.false();

            result.should.deepEqual({
                unprocessable: 1
            });
        });

        it('does not process if handleTemporaryFailed is not overridden', async function () {
            // test non-extended superclass instance
            eventProcessor = new EventProcessor();

            const result = await eventProcessor.process({
                type: 'opened',
                severity: 'temporary',
                emailId: 'testEmailId'
            });

            result.should.deepEqual({
                unprocessable: 1
            });
        });
    });

    describe('unsubscribed', function () {
        it('works', async function () {
            const result = await eventProcessor.process({
                type: 'unsubscribed'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.false();
            eventProcessor.handleUnsubscribed.calledOnce.should.be.true();

            result.should.deepEqual({
                unsubscribed: 1,
                emailIds: ['emailId']
            });
        });

        it('gets emailId and memberId directly from event if available', async function () {
            const result = await eventProcessor.process({
                type: 'unsubscribed',
                emailId: 'testEmailId',
                memberId: 'testMemberId'
            });

            eventProcessor.getEmailId.called.should.be.false();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handleUnsubscribed.calledOnce.should.be.true();

            result.should.deepEqual({
                unsubscribed: 1,
                emailIds: ['testEmailId']
            });
        });

        it('does not process if email id is not found', async function () {
            sinon.replace(eventProcessor, 'getEmailId', sinon.fake.resolves(null));

            const result = await eventProcessor.process({
                type: 'unsubscribed'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.false();
            eventProcessor.handleUnsubscribed.calledOnce.should.be.false();

            result.should.deepEqual({
                unprocessable: 1
            });
        });

        it('does not process if handleUnsubscribed is not overridden', async function () {
            // test non-extended superclass instance
            eventProcessor = new EventProcessor();

            const result = await eventProcessor.process({
                type: 'unsubscribed',
                emailId: 'testEmailId'
            });

            result.should.deepEqual({
                unprocessable: 1
            });
        });
    });

    describe('complained', function () {
        it('works', async function () {
            const result = await eventProcessor.process({
                type: 'complained'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.false();
            eventProcessor.handleComplained.calledOnce.should.be.true();

            result.should.deepEqual({
                complained: 1,
                emailIds: ['emailId']
            });
        });

        it('gets emailId and memberId directly from event if available', async function () {
            const result = await eventProcessor.process({
                type: 'complained',
                emailId: 'testEmailId',
                memberId: 'testMemberId'
            });

            eventProcessor.getEmailId.called.should.be.false();
            eventProcessor.getMemberId.called.should.be.false();
            eventProcessor.handleComplained.calledOnce.should.be.true();

            result.should.deepEqual({
                complained: 1,
                emailIds: ['testEmailId']
            });
        });

        it('does not process if email id is not found', async function () {
            sinon.replace(eventProcessor, 'getEmailId', sinon.fake.resolves(null));

            const result = await eventProcessor.process({
                type: 'complained'
            });

            eventProcessor.getEmailId.calledOnce.should.be.true();
            eventProcessor.getMemberId.calledOnce.should.be.false();
            eventProcessor.handleComplained.calledOnce.should.be.false();

            result.should.deepEqual({
                unprocessable: 1
            });
        });

        it('does not process if handleComplained is not overridden', async function () {
            // test non-extended superclass instance
            eventProcessor = new EventProcessor();

            const result = await eventProcessor.process({
                type: 'complained',
                emailId: 'testEmailId'
            });

            result.should.deepEqual({
                unprocessable: 1
            });
        });
    });
});
