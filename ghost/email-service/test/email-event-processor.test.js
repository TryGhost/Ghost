const assert = require('assert/strict');
const EmailEventProcessor = require('../lib/EmailEventProcessor');
const {createDb} = require('./utils');
const sinon = require('sinon');

describe('Email Event Processor', function () {
    let eventProcessor;
    let eventStorage;
    let db;
    let domainEvents;

    beforeEach(function () {
        db = createDb({first: {
            emailId: 'fetched-email-id',
            member_id: 'member-id',
            id: 'email-recipient-id'
        }});

        domainEvents = {
            dispatch: sinon.stub()
        };

        eventStorage = {
            handleDelivered: sinon.stub(),
            handleOpened: sinon.stub(),
            handlePermanentFailed: sinon.stub(),
            handleTemporaryFailed: sinon.stub(),
            handleComplained: sinon.stub(),
            handleUnsubscribed: sinon.stub()
        };

        eventProcessor = new EmailEventProcessor({
            db,
            domainEvents,
            eventStorage
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('getEmailId', function () {
        let reuseProcessor;

        it('Fetches from database', async function () {
            const emailId = await eventProcessor.getEmailId('provider-id');
            assert.equal(emailId, 'fetched-email-id');
            reuseProcessor = eventProcessor;
        });
        it('Returns from memory', async function () {
            sinon.stub(db, 'first').rejects('Should not be called');
            const emailId = await reuseProcessor.getEmailId('provider-id');
            assert.equal(emailId, 'fetched-email-id');
        });
    });

    describe('getRecipient', function () {
        it('Returns undefined if both providerId and emailId are missing', async function () {
            const recipient = await eventProcessor.getRecipient({});
            assert.equal(recipient, undefined);
        });

        it('Uses emailId to query recipient', async function () {
            const recipient = await eventProcessor.getRecipient({emailId: 'my-id', email: 'example@example.com'});
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'my-id'
            });
        });

        it('Uses providerId to query recipient', async function () {
            const recipient = await eventProcessor.getRecipient({providerId: 'provider-id', email: 'example@example.com'});
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'fetched-email-id'
            });
        });

        it('Returns undefined if no email found for provider', async function () {
            sinon.stub(db, 'first').resolves(null);
            const recipient = await eventProcessor.getRecipient({providerId: 'provider-id', email: 'example@example.com'});
            assert.equal(recipient, undefined);
        });

        it('Returns undefined if no recipient found for email', async function () {
            sinon.stub(db, 'first').resolves(null);
            const recipient = await eventProcessor.getRecipient({emailId: 'email-id', email: 'example@example.com'});
            assert.equal(recipient, undefined);
        });
    });

    describe('handle events', function () {
        it('handleDelivered', async function () {
            const recipient = await eventProcessor.handleDelivered({emailId: 'email-id', email: 'example@example.com'}, new Date());
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'email-id'
            });
            assert.equal(eventStorage.handleDelivered.callCount, 1);
            const event = eventStorage.handleDelivered.firstCall.args[0];
            assert.equal(event.email, 'example@example.com');
            assert.equal(event.constructor.name, 'EmailDeliveredEvent');
        });

        it('handleOpened', async function () {
            const recipient = await eventProcessor.handleOpened({emailId: 'email-id', email: 'example@example.com'}, new Date());
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'email-id'
            });
            assert.equal(eventStorage.handleOpened.callCount, 1);
            const event = eventStorage.handleOpened.firstCall.args[0];
            assert.equal(event.email, 'example@example.com');
            assert.equal(event.constructor.name, 'EmailOpenedEvent');
        });

        it('handleTemporaryFailed', async function () {
            const recipient = await eventProcessor.handleTemporaryFailed({emailId: 'email-id', email: 'example@example.com'}, new Date());
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'email-id'
            });
            assert.equal(eventStorage.handleTemporaryFailed.callCount, 1);
            const event = eventStorage.handleTemporaryFailed.firstCall.args[0];
            assert.equal(event.email, 'example@example.com');
            assert.equal(event.constructor.name, 'EmailTemporaryBouncedEvent');
        });

        it('handlePermanentFailed', async function () {
            const recipient = await eventProcessor.handlePermanentFailed({emailId: 'email-id', email: 'example@example.com'}, new Date());
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'email-id'
            });
            assert.equal(eventStorage.handlePermanentFailed.callCount, 1);
            const event = eventStorage.handlePermanentFailed.firstCall.args[0];
            assert.equal(event.email, 'example@example.com');
            assert.equal(event.constructor.name, 'EmailBouncedEvent');
        });

        it('handleUnsubscribed', async function () {
            const recipient = await eventProcessor.handleUnsubscribed({emailId: 'email-id', email: 'example@example.com'}, new Date());
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'email-id'
            });
            assert.equal(eventStorage.handleUnsubscribed.callCount, 1);
            const event = eventStorage.handleUnsubscribed.firstCall.args[0];
            assert.equal(event.email, 'example@example.com');
            assert.equal(event.constructor.name, 'EmailUnsubscribedEvent');
        });

        it('handleComplained', async function () {
            const recipient = await eventProcessor.handleComplained({emailId: 'email-id', email: 'example@example.com'}, new Date());
            assert.deepEqual(recipient, {
                emailRecipientId: 'email-recipient-id',
                memberId: 'member-id',
                emailId: 'email-id'
            });
            assert.equal(eventStorage.handleComplained.callCount, 1);
            const event = eventStorage.handleComplained.firstCall.args[0];
            assert.equal(event.email, 'example@example.com');
            assert.equal(event.constructor.name, 'SpamComplaintEvent');
        });
    });
});
