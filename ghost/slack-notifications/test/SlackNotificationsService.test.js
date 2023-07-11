const assert = require('assert/strict');
const sinon = require('sinon');
const {SlackNotificationsService} = require('../index');
const ObjectId = require('bson-objectid').default;
const {MilestoneCreatedEvent} = require('@tryghost/milestones');
const DomainEvents = require('@tryghost/domain-events');

describe('SlackNotificationsService', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new SlackNotificationsService({});
        });
    });

    describe('Slack notifications service', function () {
        let service;
        let slackNotificationStub;
        let loggingSpy;

        const config = {
            isEnabled: true,
            webhookUrl: 'https://slack-webhook.example'
        };

        beforeEach(function () {
            slackNotificationStub = sinon.stub().resolves();
            loggingSpy = sinon.spy();
        });

        afterEach(function () {
            sinon.restore();
        });

        describe('subscribeEvents', function () {
            it('subscribes to events', async function () {
                const subscribeStub = sinon.stub().resolves();

                service = new SlackNotificationsService({
                    logging: {
                        warn: () => {},
                        error: loggingSpy
                    },
                    DomainEvents: {
                        subscribe: subscribeStub
                    },
                    siteUrl: 'https://ghost.example',
                    config,
                    slackNotifications: {
                        notifyMilestoneReceived: slackNotificationStub
                    }
                });

                service.subscribeEvents();
                assert(subscribeStub.callCount === 1);
                assert(subscribeStub.calledWith(MilestoneCreatedEvent) === true);
            });

            it('handles milestone created event', async function () {
                service = new SlackNotificationsService({
                    logging: {
                        warn: () => {},
                        error: loggingSpy
                    },
                    DomainEvents,
                    siteUrl: 'https://ghost.example',
                    config,
                    slackNotifications: {
                        notifyMilestoneReceived: slackNotificationStub
                    }
                });

                service.subscribeEvents();

                DomainEvents.dispatch(MilestoneCreatedEvent.create({
                    milestone: {
                        id: new ObjectId().toHexString(),
                        type: 'arr',
                        value: 1000,
                        currency: 'usd',
                        createdAt: new Date(),
                        emailSentAt: new Date()
                    },
                    meta: {
                        currentValue: 1398
                    }
                }));

                await DomainEvents.allSettled();

                assert(loggingSpy.callCount === 0);
                assert(slackNotificationStub.calledOnce);
            });

            it('does not send notification when milestones is disabled in hostSettings', async function () {
                service = new SlackNotificationsService({
                    logging: {
                        warn: () => {},
                        error: loggingSpy
                    },
                    DomainEvents,
                    siteUrl: 'https://ghost.example',
                    config: {
                        isEnabled: false,
                        webhookUrl: 'https://slack-webhook.example'
                    },
                    slackNotifications: {
                        notifyMilestoneReceived: slackNotificationStub
                    }
                });

                service.subscribeEvents();

                DomainEvents.dispatch(MilestoneCreatedEvent.create({milestone: {}}));

                await DomainEvents.allSettled();

                assert(loggingSpy.callCount === 0);
                assert(slackNotificationStub.callCount === 0);
            });

            it('does not send notification when no url in hostSettings provided', async function () {
                service = new SlackNotificationsService({
                    logging: {
                        warn: () => {},
                        error: loggingSpy
                    },
                    DomainEvents,
                    siteUrl: 'https://ghost.example',
                    config: {
                        isEnabled: true,
                        webhookUrl: null
                    },
                    slackNotifications: {
                        notifyMilestoneReceived: slackNotificationStub
                    }
                });

                service.subscribeEvents();

                DomainEvents.dispatch(MilestoneCreatedEvent.create({milestone: {}}));

                await DomainEvents.allSettled();

                assert(loggingSpy.callCount === 0);
                assert(slackNotificationStub.callCount === 0);
            });

            it('logs error when event handling fails', async function () {
                service = new SlackNotificationsService({
                    logging: {
                        warn: () => {},
                        error: loggingSpy
                    },
                    DomainEvents,
                    siteUrl: 'https://ghost.example',
                    config,
                    slackNotifications: {
                        async notifyMilestoneReceived() {
                            throw new Error('test');
                        }
                    }
                });

                service.subscribeEvents();

                DomainEvents.dispatch(MilestoneCreatedEvent.create({
                    milestone: {
                        type: 'members',
                        name: 'members-100',
                        value: 100,
                        createdAt: new Date()
                    }
                }));

                await DomainEvents.allSettled();
                const loggingSpyCall = loggingSpy.getCall(0).args[0];
                assert(loggingSpy.calledOnce);
                assert(loggingSpyCall instanceof Error);
            });
        });
    });
});
