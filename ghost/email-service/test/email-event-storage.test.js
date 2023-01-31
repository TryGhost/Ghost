const EmailEventStorage = require('../lib/email-event-storage');
const {EmailDeliveredEvent, EmailOpenedEvent, EmailBouncedEvent, EmailTemporaryBouncedEvent, EmailUnsubscribedEvent, SpamComplaintEvent} = require('@tryghost/email-events');
const sinon = require('sinon');
const assert = require('assert');
const logging = require('@tryghost/logging');
const {createDb} = require('./utils');

describe('Email Event Storage', function () {
    let logError;

    beforeEach(function () {
        logError = sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new EmailEventStorage({});
        });
    });

    it('Handles email delivered events', async function () {
        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailDeliveredEvent) {
                    handler(EmailDeliveredEvent.create({
                        email: 'example@example.com',
                        memberId: '123',
                        emailId: '456',
                        emailRecipientId: '789',
                        timestamp: new Date(0)
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
        const db = createDb();
        const eventHandler = new EmailEventStorage({db});
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].delivered_at);
    });

    it('Handles email opened events', async function () {
        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailOpenedEvent) {
                    handler(EmailOpenedEvent.create({
                        email: 'example@example.com',
                        memberId: '123',
                        emailId: '456',
                        emailRecipientId: '789',
                        timestamp: new Date(0)
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
        const db = createDb();
        const eventHandler = new EmailEventStorage({db});
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].opened_at);
    });

    it('Handles email permanent bounce events with update', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailBouncedEvent) {
                    waitPromise = handler(EmailBouncedEvent.create({
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
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
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
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(existing.save.calledOnce);
    });

    it('Handles email permanent bounce events with insert', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailBouncedEvent) {
                    waitPromise = handler(EmailBouncedEvent.create({
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
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
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
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(EmailRecipientFailure.add.calledOnce);
    });

    it('Handles email permanent bounce event without error data', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailBouncedEvent) {
                    waitPromise = handler(EmailBouncedEvent.create({
                        email: 'example@example.com',
                        memberId: '123',
                        emailId: '456',
                        emailRecipientId: '789',
                        error: null,
                        timestamp: new Date(0)
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
        const db = createDb();

        const eventHandler = new EmailEventStorage({
            db,
            models: {}
        });
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        sinon.assert.calledOnce(db.update);
    });

    it('Handles email permanent bounce events with skipped update', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailBouncedEvent) {
                    waitPromise = handler(EmailBouncedEvent.create({
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
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
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
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        sinon.assert.calledOnce(db.update);
        assert(!!db.update.firstCall.args[0].failed_at);
        assert(EmailRecipientFailure.findOne.called);
        assert(!existing.save.called);
    });

    it('Handles email temporary bounce events with update', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailTemporaryBouncedEvent) {
                    waitPromise = handler(EmailTemporaryBouncedEvent.create({
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
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
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
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        assert(existing.save.calledOnce);
    });

    it('Handles email temporary bounce events with skipped update', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailTemporaryBouncedEvent) {
                    waitPromise = handler(EmailTemporaryBouncedEvent.create({
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
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
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
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        assert(existing.save.notCalled);
    });

    it('Handles unsubscribe', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === EmailUnsubscribedEvent) {
                    waitPromise = handler(EmailUnsubscribedEvent.create({
                        email: 'example@example.com',
                        memberId: '123',
                        emailId: '456',
                        timestamp: new Date(0)
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
        const update = sinon.stub().resolves();

        const eventHandler = new EmailEventStorage({
            membersRepository: {
                update
            }
        });
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        assert(update.calledOnce);
        assert(update.firstCall.args[0].newsletters.length === 0);
    });

    it('Handles complaints', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === SpamComplaintEvent) {
                    waitPromise = handler(SpamComplaintEvent.create({
                        email: 'example@example.com',
                        memberId: '123',
                        emailId: '456',
                        timestamp: new Date(0)
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
        const EmailSpamComplaintEvent = {
            add: sinon.stub().resolves()
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailSpamComplaintEvent
            }
        });
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        assert(EmailSpamComplaintEvent.add.calledOnce);
    });

    it('Handles duplicate complaints', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === SpamComplaintEvent) {
                    waitPromise = handler(SpamComplaintEvent.create({
                        email: 'example@example.com',
                        memberId: '123',
                        emailId: '456',
                        timestamp: new Date(0)
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
        const EmailSpamComplaintEvent = {
            add: sinon.stub().rejects({code: 'ER_DUP_ENTRY'})
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailSpamComplaintEvent
            }
        });
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        assert(EmailSpamComplaintEvent.add.calledOnce);
        assert(!logError.calledOnce);
    });

    it('Handles logging failed complaint storage', async function () {
        let waitPromise;

        const DomainEvents = {
            subscribe: async (type, handler) => {
                if (type === SpamComplaintEvent) {
                    waitPromise = handler(SpamComplaintEvent.create({
                        email: 'example@example.com',
                        memberId: '123',
                        emailId: '456',
                        timestamp: new Date(0)
                    }));
                }
            }
        };

        const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
        const EmailSpamComplaintEvent = {
            add: sinon.stub().rejects(new Error('Some database error'))
        };

        const eventHandler = new EmailEventStorage({
            models: {
                EmailSpamComplaintEvent
            }
        });
        eventHandler.listen(DomainEvents);
        sinon.assert.callCount(subscribeSpy, 6);
        await waitPromise;
        assert(EmailSpamComplaintEvent.add.calledOnce);
        assert(logError.calledOnce);
    });
});
