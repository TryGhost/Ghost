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

        const config = {
            isEnabled: true,
            webhookUrl: 'https://slack-webhook.example'
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
                siteUrl: 'https://ghost.example',
                config
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
                    siteUrl: 'https://ghost.example',
                    config
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
                        },
                        meta: {
                            currentARR: 1398
                        }
                    }
                });

                assert.strictEqual(slackWebhookStub.isDone(), true);
            });

            it('does not send notification when milestones is disabled in hostSettings', async function () {
                service = new SlackNotificationsService({
                    config: {
                        enabled: false,
                        webhookUrl: 'https://slack-webhook.example'
                    }
                });

                await service.handleEvent(MilestoneCreatedEvent, {data: {milestone: {}}});
                assert.strictEqual(slackWebhookStub.isDone(), false);
            });

            it('does not send notification when no url in hostSettings provided', async function () {
                service = new SlackNotificationsService({
                    config: {
                        enabled: true,
                        webhookUrl: null
                    }
                });

                await service.handleEvent(MilestoneCreatedEvent, {data: {milestone: {}}});
                assert.strictEqual(slackWebhookStub.isDone(), false);
            });
        });
    });
});
