const assert = require('assert');
const sinon = require('sinon');
const SlackNotificationsService = require('../index');
const nock = require('nock');
const ObjectId = require('bson-objectid').default;
const {MilestoneCreatedEvent} = require('@tryghost/milestones');

describe('SlackNotificationsService', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new SlackNotificationsService({});
        });
    });

    describe('Slack notifications service', function () {
        let subscribeStub;
        let service;
        let slackWebhookStub;

        const urlUtils = {
            getSiteUrl: () => {
                return 'https://ghost.example';
            }
        };

        const config = {
            get: (setting) => {
                if (setting === 'hostSettings') {
                    return {
                        milestones: {
                            enabled: true,
                            url: 'https://slack-webhook.example'
                        }
                    };
                }
                return '';
            }
        };

        beforeEach(function () {
            subscribeStub = sinon.stub().resolves();

            service = new SlackNotificationsService({
                logging: {
                    warn: () => {},
                    error: () => {}
                },
                DomainEvents: {
                    subscribe: subscribeStub
                },
                urlUtils,
                config,
                labs: {
                    isSet: () => 'milestoneEmails'
                }
            });

            slackWebhookStub = nock('https://slack-webhook.example')
                .post('/')
                .reply(200, {message: 'success'});
        });

        afterEach(function () {
            sinon.restore();
            nock.cleanAll();
        });

        describe('subscribeEvents', function () {
            it('subscribes to events', async function () {
                service.subscribeEvents();
                assert(subscribeStub.callCount === 1);
                assert(subscribeStub.calledWith(MilestoneCreatedEvent) === true);
            });
        });

        describe('handleEvents', function () {
            it('handles milestone created event', async function () {
                service = new SlackNotificationsService({
                    logging: {
                        warn: () => {},
                        error: () => {}
                    },
                    DomainEvents: {
                        subscribe: subscribeStub
                    },
                    urlUtils,
                    config,
                    labs: {
                        isSet: () => 'milestoneEmails'
                    }
                });

                await service.handleEvent(MilestoneCreatedEvent, {
                    data: {
                        milestone: {
                            id: new ObjectId().toHexString(),
                            type: 'arr',
                            value: 1000,
                            currency: 'usd',
                            createdAt: new Date(),
                            emailSentAt: new Date()
                        }
                    }
                });

                assert.strictEqual(slackWebhookStub.isDone(), true);
            });

            it('does not send notification when milestoneEmails labs flag is not set', async function () {
                service = new SlackNotificationsService({
                    labs: {
                        isSet: () => false
                    }
                });

                await service.handleEvent(MilestoneCreatedEvent, {data: {milestone: {}}});
                assert.strictEqual(slackWebhookStub.isDone(), false);
            });

            it('does not send notification when milestones is disabled in hostSettings', async function () {
                service = new SlackNotificationsService({
                    config: {
                        get: (setting) => {
                            if (setting === 'hostSettings') {
                                return {
                                    milestones: {
                                        enabled: false,
                                        url: 'https://slack-webhook.example'
                                    }
                                };
                            }
                            return '';
                        }
                    },
                    labs: {
                        isSet: () => 'milestoneEmails'
                    }
                });

                await service.handleEvent(MilestoneCreatedEvent, {data: {milestone: {}}});
                assert.strictEqual(slackWebhookStub.isDone(), false);
            });

            it('does not send notification when no url in hostSettings provided', async function () {
                service = new SlackNotificationsService({
                    config: {
                        get: (setting) => {
                            if (setting === 'hostSettings') {
                                return {
                                    milestones: {
                                        enabled: true
                                    }
                                };
                            }
                            return '';
                        }
                    },
                    labs: {
                        isSet: () => 'milestoneEmails'
                    }
                });

                await service.handleEvent(MilestoneCreatedEvent, {data: {milestone: {}}});
                assert.strictEqual(slackWebhookStub.isDone(), false);
            });
        });
    });
});
