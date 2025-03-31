const EmailEventStorage = require('../lib/EmailEventStorage');

const sinon = require('sinon');
const assert = require('assert/strict');
const logging = require('@tryghost/logging');
const {createDb, createPrometheusClient} = require('./utils');

const EmailDeliveredEvent = require('../lib/events/EmailDeliveredEvent');
const EmailOpenedEvent = require('../lib/events/EmailOpenedEvent');
const EmailBouncedEvent = require('../lib/events/EmailBouncedEvent');
const EmailTemporaryBouncedEvent = require('../lib/events/EmailTemporaryBouncedEvent');
const EmailUnsubscribedEvent = require('../lib/events/EmailUnsubscribedEvent');
const SpamComplaintEvent = require('../lib/events/SpamComplaintEvent');

describe('Email Event Storage', function () {
    let logError;

    beforeEach(function () {
        logError = sinon.stub(logging, 'error');
        sinon.stub(logging, 'info');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new EmailEventStorage({});
        });

        it('sets up metrics if prometheusClient is provided', function () {
            const prometheusClient = createPrometheusClient();
            new EmailEventStorage({prometheusClient});
            sinon.assert.calledOnce(prometheusClient.registerCounter);
        });
    });

    it('Handles email delivered events', async function () {
        const event = EmailDeliveredEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            timestamp: new Date(0)
        });

        const db = createDb();
        const eventHandler = new EmailEventStorage({db});
        await eventHandler.handleDelivered(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].delivered_at);
    });

    it('Records the event stored metric when handling email delivered events', async function () {
        const event = EmailDeliveredEvent.create({});
        const db = createDb();
        const prometheusClient = createPrometheusClient();
        const eventHandler = new EmailEventStorage({db, prometheusClient});
        sinon.stub(eventHandler, 'recordEventStored').resolves();
        await eventHandler.handleDelivered(event);
        assert(eventHandler.recordEventStored.calledOnce);
    });

    it('Handles email opened events', async function () {
        const event = EmailOpenedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            timestamp: new Date(0)
        });

        const db = createDb();
        const eventHandler = new EmailEventStorage({db});
        await eventHandler.handleOpened(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].opened_at);
    });

    it('Records the event stored metric when handling email opened events', async function () {
        const event = EmailOpenedEvent.create({});
        const db = createDb();
        const prometheusClient = createPrometheusClient();
        const eventHandler = new EmailEventStorage({db, prometheusClient});
        sinon.stub(eventHandler, 'recordEventStored').resolves();
        await eventHandler.handleOpened(event);
        assert(eventHandler.recordEventStored.calledOnce);
    });

    it('Handles email permanent bounce events with update', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: 'test',
                code: 500,
                enhancedCode: '5.5.5'
            },
            timestamp: new Date(0)
        });

        const db = createDb();
        const existing = {
            id: 1,
            get: (key) => {
                if (key === 'severity') {
                    return 'temporary';
                }
                if (key === 'failed_at') {
                    return new Date(-5);
                }
            },
            save: sinon.stub().resolves()
        };
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(existing)
        };

        const eventHandler = new EmailEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(existing.save.calledOnce);
    });

    it('Handles email permanent bounce events with update and empty message', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: '',
                code: 500,
                enhancedCode: '5.5.5'
            },
            timestamp: new Date(0)
        });

        const db = createDb();
        const existing = {
            id: 1,
            get: (key) => {
                if (key === 'severity') {
                    return 'temporary';
                }
                if (key === 'failed_at') {
                    return new Date(-5);
                }
            },
            save: sinon.stub().resolves()
        };
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(existing)
        };

        const eventHandler = new EmailEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(existing.save.calledOnce);
    });

    it('Handles email permanent bounce events with update and empty message and without enhanced code', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: '',
                code: 500
            },
            timestamp: new Date(0)
        });

        const db = createDb();
        const existing = {
            id: 1,
            get: (key) => {
                if (key === 'severity') {
                    return 'temporary';
                }
                if (key === 'failed_at') {
                    return new Date(-5);
                }
            },
            save: sinon.stub().resolves()
        };
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(existing)
        };

        const eventHandler = new EmailEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(existing.save.calledOnce);
    });

    it('Handles email permanent bounce events with insert', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: 'test',
                code: 500,
                enhancedCode: '5.5.5'
            },
            timestamp: new Date(0)
        });

        const db = createDb();
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(undefined),
            add: sinon.stub().resolves()
        };

        const eventHandler = new EmailEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(EmailRecipientFailure.add.calledOnce);
    });

    it('Handles email permanent bounce events with insert and empty message', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: '',
                code: 500,
                enhancedCode: '5.5.5'
            },
            timestamp: new Date(0)
        });

        const db = createDb();
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(undefined),
            add: sinon.stub().resolves()
        };

        const eventHandler = new EmailEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(EmailRecipientFailure.add.calledOnce);
    });

    it('Handles email permanent bounce events with insert and empty message and without enhanced code', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: '',
                code: 500
            },
            timestamp: new Date(0)
        });

        const db = createDb();
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(undefined),
            add: sinon.stub().resolves()
        };

        const eventHandler = new EmailEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(EmailRecipientFailure.add.calledOnce);
    });

    it('Handles email permanent bounce event without error data', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: null,
            timestamp: new Date(0)
        });

        const db = createDb();
        const eventHandler = new EmailEventStorage({
            db,
            models: {}
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
    });

    it('Handles email permanent bounce events with skipped update', async function () {
        const event = EmailBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: 'test',
                code: 500,
                enhancedCode: '5.5.5'
            },
            timestamp: new Date(0)
        });

        const db = createDb();
        const existing = {
            id: 1,
            get: (key) => {
                if (key === 'severity') {
                    return 'permanent';
                }
                if (key === 'failed_at') {
                    return new Date(-5);
                }
            },
            save: sinon.stub().resolves()
        };
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(existing)
        };

        const eventHandler = new EmailEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(EmailRecipientFailure.findOne.called);
        assert(!existing.save.called);
    });

    it('Handles email temporary bounce events with update', async function () {
        const event = EmailTemporaryBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: 'test',
                code: 500,
                enhancedCode: null
            },
            timestamp: new Date(0)
        });

        const existing = {
            id: 1,
            get: (key) => {
                if (key === 'severity') {
                    return 'temporary';
                }
                if (key === 'failed_at') {
                    return new Date(-5);
                }
            },
            save: sinon.stub().resolves()
        };
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(existing)
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handleTemporaryFailed(event);
        assert(existing.save.calledOnce);
    });

    it('Handles email temporary bounce events with skipped update', async function () {
        const event = EmailTemporaryBouncedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            emailRecipientId: '789',
            error: {
                message: 'test',
                code: 500,
                enhancedCode: '5.5.5'
            },
            timestamp: new Date(0)
        });

        const existing = {
            id: 1,
            get: (key) => {
                if (key === 'severity') {
                    return 'temporary';
                }
                if (key === 'failed_at') {
                    return new Date(5);
                }
            },
            save: sinon.stub().resolves()
        };
        const EmailRecipientFailure = {
            transaction: async function (callback) {
                return await callback(1);
            },
            findOne: sinon.stub().resolves(existing)
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handleTemporaryFailed(event);
        assert(existing.save.notCalled);
    });

    it('Handles unsubscribe', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const update = sinon.stub().resolves();

        const emailSuppressionList = {
            removeUnsubscribe: sinon.stub().resolves()
        };

        const eventHandler = new EmailEventStorage({
            membersRepository: {
                update
            },
            emailSuppressionList
        });
        await eventHandler.handleUnsubscribed(event);
        assert(update.calledOnce);
        assert(update.firstCall.args[0].newsletters.length === 0);
        assert(emailSuppressionList.removeUnsubscribe.calledOnce);
    });

    it('Handles unsubscribe with a non-existent member', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const error = new Error('Member not found');
        const update = sinon.stub().throws(error);

        const eventHandler = new EmailEventStorage({
            membersRepository: {
                update
            }
        });
        await eventHandler.handleUnsubscribed(event);
        assert(update.calledOnce);
        assert(update.firstCall.args[0].newsletters.length === 0);
    });

    it('Finds newsletters to keep during an unsubscribe', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const Email = {
            findOne: sinon.stub().resolves({
                get: sinon.stub().returns('newsletter_1')
            })
        };

        const membersRepository = {
            get: sinon.stub().resolves({
                related: sinon.stub().returns({
                    models: [
                        {id: 'newsletter_1'},
                        {id: 'newsletter_2'}
                    ]
                })
            })
        };

        const eventHandler = new EmailEventStorage({
            membersRepository,
            models: {
                Email
            }
        });

        const result = await eventHandler.findNewslettersToKeep(event);

        assert(result.length === 1);
        assert(result[0].id === 'newsletter_2');
    });

    it('Handles complaints', async function () {
        const event = SpamComplaintEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const EmailSpamComplaintEvent = {
            add: sinon.stub().resolves()
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailSpamComplaintEvent
            }
        });
        await eventHandler.handleComplained(event);
        assert(EmailSpamComplaintEvent.add.calledOnce);
    });

    it('Handles duplicate complaints', async function () {
        const event = SpamComplaintEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const EmailSpamComplaintEvent = {
            add: sinon.stub().rejects({code: 'ER_DUP_ENTRY'})
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailSpamComplaintEvent
            }
        });
        await eventHandler.handleComplained(event);
        assert(EmailSpamComplaintEvent.add.calledOnce);
        assert(!logError.calledOnce);
    });

    it('Handles logging failed complaint storage', async function () {
        const event = SpamComplaintEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const EmailSpamComplaintEvent = {
            add: sinon.stub().rejects(new Error('Some database error'))
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailSpamComplaintEvent
            }
        });
        await eventHandler.handleComplained(event);
        assert(EmailSpamComplaintEvent.add.calledOnce);
        assert(logError.calledOnce);
    });

    describe('recordEventStored', function () {
        it('increments the counter', function () {
            const incStub = sinon.stub();
            const prometheusClient = {
                registerCounter: sinon.stub(),
                getMetric: sinon.stub().returns({
                    inc: incStub
                })
            };
            const eventHandler = new EmailEventStorage({prometheusClient});
            eventHandler.recordEventStored('delivered');
            sinon.assert.calledOnce(incStub);
        });

        it('does not throw if recording the event metric fails', function () {
            const prometheusClient = {
                registerCounter: sinon.stub(),
                getMetric: sinon.stub().throws(new Error('Metric not found'))
            };
            const eventHandler = new EmailEventStorage({prometheusClient});
            assert.doesNotThrow(() => eventHandler.recordEventStored('delivered'));
        });
    });
});
