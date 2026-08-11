const NewsletterEmailEventStorage = require('../../../../../core/server/services/email-service/newsletter-email-event-storage');

const sinon = require('sinon');
const assert = require('node:assert/strict');
const logging = require('@tryghost/logging');
const {createDb, createPrometheusClient} = require('./utils');
const config = require('../../../../../core/shared/config');

const EmailDeliveredEvent = require('../../../../../core/server/services/email-service/events/email-delivered-event');
const EmailOpenedEvent = require('../../../../../core/server/services/email-service/events/email-opened-event');
const EmailBouncedEvent = require('../../../../../core/server/services/email-service/events/email-bounced-event');
const EmailTemporaryBouncedEvent = require('../../../../../core/server/services/email-service/events/email-temporary-bounced-event');
const EmailUnsubscribedEvent = require('../../../../../core/server/services/email-service/events/email-unsubscribed-event');
const SpamComplaintEvent = require('../../../../../core/server/services/email-service/events/spam-complaint-event');

const createEventStorage = (dependencies = {}) => new NewsletterEmailEventStorage({config, ...dependencies});

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
            createEventStorage({});
        });

        it('sets up metrics if prometheusClient is provided', function () {
            const prometheusClient = createPrometheusClient();
            createEventStorage({prometheusClient});
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
        const eventHandler = createEventStorage({db});
        await eventHandler.handleDelivered(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].delivered_at);
    });

    it('Records the event stored metric when handling email delivered events', async function () {
        const event = EmailDeliveredEvent.create({});
        const db = createDb();
        const prometheusClient = createPrometheusClient();
        const eventHandler = createEventStorage({db, prometheusClient});
        sinon.stub(eventHandler, 'recordEventStored').resolves();
        await eventHandler.handleDelivered(event);
        sinon.assert.calledOnce(eventHandler.recordEventStored);
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
        const eventHandler = createEventStorage({db});
        await eventHandler.handleOpened(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].opened_at);
    });

    it('Records the event stored metric when handling email opened events', async function () {
        const event = EmailOpenedEvent.create({});
        const db = createDb();
        const prometheusClient = createPrometheusClient();
        const eventHandler = createEventStorage({db, prometheusClient});
        sinon.stub(eventHandler, 'recordEventStored').resolves();
        await eventHandler.handleOpened(event);
        sinon.assert.calledOnce(eventHandler.recordEventStored);
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

        const eventHandler = createEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        sinon.assert.calledOnce(existing.save);
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

        const eventHandler = createEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        sinon.assert.calledOnce(existing.save);
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

        const eventHandler = createEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        sinon.assert.calledOnce(existing.save);
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

        const eventHandler = createEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        sinon.assert.calledOnce(EmailRecipientFailure.add);
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

        const eventHandler = createEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        sinon.assert.calledOnce(EmailRecipientFailure.add);
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

        const eventHandler = createEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        sinon.assert.calledOnce(EmailRecipientFailure.add);
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
        const eventHandler = createEventStorage({
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

        const eventHandler = createEventStorage({
            db,
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handlePermanentFailed(event);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        sinon.assert.called(EmailRecipientFailure.findOne);
        sinon.assert.notCalled(existing.save);
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

        const eventHandler = createEventStorage({
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handleTemporaryFailed(event);
        sinon.assert.calledOnce(existing.save);
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

        const eventHandler = createEventStorage({
            models: {
                EmailRecipientFailure
            }
        });
        await eventHandler.handleTemporaryFailed(event);
        sinon.assert.notCalled(existing.save);
    });

    it('Handles unsubscribe', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const update = sinon.stub().resolves();
        // The member is resolved by id and is subscribed to two newsletters
        const get = sinon.stub().resolves({
            related: sinon.stub().returns({
                models: [
                    {id: 'newsletter_1'},
                    {id: 'newsletter_2'}
                ]
            })
        });

        const emailSuppressionList = {
            removeUnsubscribe: sinon.stub().resolves()
        };

        const Email = {
            // The email being unsubscribed from belongs to newsletter_1
            findOne: sinon.stub().resolves({
                get: sinon.stub().returns('newsletter_1')
            })
        };

        const eventHandler = createEventStorage({
            membersRepository: {
                get,
                update
            },
            models: {
                Email
            },
            emailSuppressionList
        });
        await eventHandler.handleUnsubscribed(event);

        sinon.assert.calledWithMatch(get, {id: '123'});

        sinon.assert.calledOnce(update);
        assert(update.firstCall.args[0].newsletters.length === 1);
        assert(update.firstCall.args[0].newsletters[0].id === 'newsletter_2');
        sinon.assert.calledOnce(emailSuppressionList.removeUnsubscribe);

        // Suppression may only be lifted once the local record is written
        sinon.assert.callOrder(update, emailSuppressionList.removeUnsubscribe);
    });

    it('Unsubscribes a member subscribed to a single newsletter', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const update = sinon.stub().resolves();
        const get = sinon.stub().resolves({
            related: sinon.stub().returns({
                models: [{id: 'newsletter_1'}]
            })
        });

        const emailSuppressionList = {
            removeUnsubscribe: sinon.stub().resolves()
        };

        const Email = {
            findOne: sinon.stub().resolves({
                get: sinon.stub().returns('newsletter_1')
            })
        };

        const eventHandler = createEventStorage({
            membersRepository: {
                get,
                update
            },
            models: {
                Email
            },
            emailSuppressionList
        });
        await eventHandler.handleUnsubscribed(event);

        sinon.assert.calledOnce(update);
        assert.deepEqual(update.firstCall.args[0].newsletters, []);
        sinon.assert.calledOnce(emailSuppressionList.removeUnsubscribe);
        sinon.assert.calledWith(emailSuppressionList.removeUnsubscribe, 'example@example.com');
        sinon.assert.callOrder(update, emailSuppressionList.removeUnsubscribe);
    });

    it('Lifts Mailgun suppression when the member cannot be resolved', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const get = sinon.stub().resolves(null);
        const update = sinon.stub().resolves();
        const emailSuppressionList = {
            removeUnsubscribe: sinon.stub().resolves()
        };

        const eventHandler = createEventStorage({
            membersRepository: {
                get,
                update
            },
            emailSuppressionList
        });
        await eventHandler.handleUnsubscribed(event);

        sinon.assert.notCalled(update);
        sinon.assert.calledOnce(emailSuppressionList.removeUnsubscribe);
        sinon.assert.calledWith(emailSuppressionList.removeUnsubscribe, 'example@example.com');
    });

    it('Keeps Mailgun suppression when the lookup fails', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const get = sinon.stub().resolves({
            related: sinon.stub().returns({
                models: [{id: 'newsletter_1'}, {id: 'newsletter_2'}]
            })
        });
        const update = sinon.stub().resolves();
        const Email = {
            findOne: sinon.stub().rejects(new Error('transient DB error'))
        };
        const emailSuppressionList = {
            removeUnsubscribe: sinon.stub().resolves()
        };

        const eventHandler = createEventStorage({
            membersRepository: {
                get,
                update
            },
            models: {
                Email
            },
            emailSuppressionList
        });
        await eventHandler.handleUnsubscribed(event);

        sinon.assert.notCalled(update);
        sinon.assert.notCalled(emailSuppressionList.removeUnsubscribe);
        sinon.assert.calledOnce(logError);
    });

    it('Keeps Mailgun suppression when the email record is missing', async function () {
        const event = EmailUnsubscribedEvent.create({
            email: 'example@example.com',
            memberId: '123',
            emailId: '456',
            timestamp: new Date(0)
        });

        const get = sinon.stub().resolves({
            related: sinon.stub().returns({
                models: [{id: 'newsletter_1'}, {id: 'newsletter_2'}]
            })
        });
        const update = sinon.stub().resolves();
        const Email = {
            findOne: sinon.stub().resolves(null)
        };
        const emailSuppressionList = {
            removeUnsubscribe: sinon.stub().resolves()
        };

        const eventHandler = createEventStorage({
            membersRepository: {
                get,
                update
            },
            models: {
                Email
            },
            emailSuppressionList
        });
        await eventHandler.handleUnsubscribed(event);

        sinon.assert.notCalled(update);
        sinon.assert.notCalled(emailSuppressionList.removeUnsubscribe);
        sinon.assert.calledOnce(logError);
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

        const eventHandler = createEventStorage({
            membersRepository,
            models: {
                Email
            }
        });

        const result = await eventHandler.findNewslettersToKeep(event);

        assert.equal(result.status, 'ok');
        assert.deepEqual(result.newsletters, [{id: 'newsletter_2'}]);
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

        const emailSuppressionList = {
            removeComplaint: sinon.stub().resolves()
        };

        const eventHandler = createEventStorage({
            models: {
                EmailSpamComplaintEvent
            },
            emailSuppressionList
        });
        await eventHandler.handleComplained(event);
        sinon.assert.calledOnce(EmailSpamComplaintEvent.add);
        sinon.assert.calledOnce(emailSuppressionList.removeComplaint);
        sinon.assert.calledWith(emailSuppressionList.removeComplaint, 'example@example.com');
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

        const emailSuppressionList = {
            removeComplaint: sinon.stub().resolves()
        };

        const eventHandler = createEventStorage({
            models: {
                EmailSpamComplaintEvent
            },
            emailSuppressionList
        });
        await eventHandler.handleComplained(event);
        sinon.assert.calledOnce(EmailSpamComplaintEvent.add);
        sinon.assert.notCalled(logError);
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

        const emailSuppressionList = {
            removeComplaint: sinon.stub().resolves()
        };

        const eventHandler = createEventStorage({
            models: {
                EmailSpamComplaintEvent
            },
            emailSuppressionList
        });
        await eventHandler.handleComplained(event);
        sinon.assert.calledOnce(EmailSpamComplaintEvent.add);
        sinon.assert.calledOnce(logError);
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
            const eventHandler = createEventStorage({prometheusClient});
            eventHandler.recordEventStored('delivered');
            sinon.assert.calledOnce(incStub);
        });

        it('does not throw if recording the event metric fails', function () {
            const prometheusClient = {
                registerCounter: sinon.stub(),
                getMetric: sinon.stub().throws(new Error('Metric not found'))
            };
            const eventHandler = createEventStorage({prometheusClient});
            assert.doesNotThrow(() => eventHandler.recordEventStored('delivered'));
        });
    });
});
