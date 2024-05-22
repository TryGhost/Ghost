const assert = require('assert/strict');
const sinon = require('sinon');
const SlackNotifications = require('../lib/SlackNotifications');
const nock = require('nock');
const ObjectId = require('bson-objectid').default;
const got = require('got');
const ghostVersion = require('@tryghost/version');

describe('SlackNotifications', function () {
    let slackNotifications;
    let loggingErrorStub;

    beforeEach(function () {
        loggingErrorStub = sinon.stub();

        slackNotifications = new SlackNotifications({
            logging: {
                warn: () => {},
                error: loggingErrorStub
            },
            siteUrl: 'https://ghost.example',
            webhookUrl: 'https://slack-webhook.example'
        });

        nock('https://slack-webhook.example')
            .post('/')
            .reply(200, {message: 'success'});
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('notifyMilestoneReceived', function () {
        let sendStub;

        beforeEach(function () {
            sendStub = slackNotifications.send = sinon.stub().resolves();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('Sends a notification to Slack for achieved ARR Milestone - no meta', async function () {
            await slackNotifications.notifyMilestoneReceived({
                milestone: {
                    id: ObjectId().toHexString(),
                    name: 'arr-1000-usd',
                    type: 'arr',
                    createdAt: '2023-02-15T00:00:00.000Z',
                    emailSentAt: '2023-02-15T00:00:00.000Z',
                    value: 1000,
                    currency: 'gbp'
                }
            });

            const expectedResult = {
                unfurl_links: false,
                username: 'Ghost Milestone Service',
                attachments: [{
                    color: '#36a64f',
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: ':tada: ARR Milestone £1,000.00 reached!',
                                emoji: true
                            }
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: 'New *ARR Milestone* achieved for <https://ghost.example|https://ghost.example>'
                            }
                        },
                        {
                            type: 'divider'
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: '*Milestone:*\n£1,000.00'
                                }
                            ]
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '*Email sent:*\n15 Feb 2023'
                            }
                        }
                    ]
                }]
            };

            assert(sendStub.calledOnce === true);
            assert(sendStub.calledWith(expectedResult, 'https://slack-webhook.example') === true);
        });

        it('Sends a notification to Slack for achieved Members Milestone and shows reason when imported members', async function () {
            await slackNotifications.notifyMilestoneReceived({
                milestone: {
                    id: ObjectId().toHexString(),
                    name: 'members-50000',
                    type: 'members',
                    createdAt: null,
                    emailSentAt: null,
                    value: 50000
                },
                meta: {
                    currentValue: 59857,
                    reason: 'import'
                }
            });

            const expectedResult = {
                unfurl_links: false,
                username: 'Ghost Milestone Service',
                attachments: [{
                    color: '#36a64f',
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: ':tada: Members Milestone 50,000 reached!',
                                emoji: true
                            }
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: 'New *Members Milestone* achieved for <https://ghost.example|https://ghost.example>'
                            }
                        },
                        {
                            type: 'divider'
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: '*Milestone:*\n50,000'
                                },
                                {
                                    type: 'mrkdwn',
                                    text: '*Current Members:*\n59,857'
                                }
                            ]
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '*Email sent:*\nno / has imported members'
                            }
                        }
                    ]
                }]
            };

            assert(sendStub.calledOnce === true);
            assert(sendStub.calledWith(expectedResult, 'https://slack-webhook.example') === true);
        });

        it('Shows the correct reason for email not send when last email was too recent', async function () {
            await slackNotifications.notifyMilestoneReceived({
                milestone: {
                    id: ObjectId().toHexString(),
                    name: 'arr-1000-eur',
                    type: 'arr',
                    currency: 'eur',
                    createdAt: '2023-02-15T00:00:00.000Z',
                    emailSentAt: null,
                    value: 1000
                },
                meta: {
                    currentValue: 1005,
                    reason: 'email'
                }
            });

            const expectedResult = {
                unfurl_links: false,
                username: 'Ghost Milestone Service',
                attachments: [{
                    color: '#36a64f',
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: ':tada: ARR Milestone €1,000.00 reached!',
                                emoji: true
                            }
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: 'New *ARR Milestone* achieved for <https://ghost.example|https://ghost.example>'
                            }
                        },
                        {
                            type: 'divider'
                        },
                        {
                            type: 'section',
                            fields: [
                                {
                                    type: 'mrkdwn',
                                    text: '*Milestone:*\n€1,000.00'
                                },
                                {
                                    type: 'mrkdwn',
                                    text: '*Current ARR:*\n€1,005.00'
                                }
                            ]
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '*Email sent:*\nno / last email too recent'
                            }
                        }
                    ]
                }]
            };

            assert(sendStub.calledOnce === true);
            assert(sendStub.calledWith(expectedResult, 'https://slack-webhook.example') === true);
        });

        it('Does not attempt to send notification for `skipped` milestones', async function () {
            await slackNotifications.notifyMilestoneReceived({
                milestone: {
                    id: ObjectId().toHexString(),
                    name: 'arr-1000-eur',
                    type: 'arr',
                    currency: 'eur',
                    createdAt: '2023-02-15T00:00:00.000Z',
                    value: 1000
                },
                meta: {
                    currentValue: 1005,
                    reason: 'skipped'
                }
            });

            assert(sendStub.callCount === 0);
        });

        it('Does not attempt to send notification for `initial` milestones', async function () {
            await slackNotifications.notifyMilestoneReceived({
                milestone: {
                    id: ObjectId().toHexString(),
                    name: 'arr-1000-eur',
                    type: 'arr',
                    currency: 'eur',
                    createdAt: '2023-02-15T00:00:00.000Z',
                    value: 1000
                },
                meta: {
                    currentValue: 1005,
                    reason: 'initial'
                }
            });

            assert(sendStub.callCount === 0);
        });
    });

    describe('send', function () {
        it('Sends with correct requestOptions', async function () {
            const gotStub = sinon.stub(got, 'post').resolves();
            sinon.stub(ghostVersion, 'original').value('5.0.0');

            const expectedRequestOptions = [
                'https://slack-webhook.com',
                {
                    body: '{"data":"test"}',
                    headers: {'user-agent': 'Ghost/5.0.0 (https://github.com/TryGhost/Ghost)'},
                    retry: 0
                }
            ];

            await slackNotifications.send({data: 'test'}, 'https://slack-webhook.com');
            assert(loggingErrorStub.callCount === 0);
            assert(gotStub.calledOnce === true);
            const gotStubArgs = gotStub.getCall(0).args;
            assert.deepEqual(gotStubArgs, expectedRequestOptions);
        });

        it('Throws when invalid URL is passed', async function () {
            await slackNotifications.send({}, 'https://invalid-url');
            assert(loggingErrorStub.callCount === 1);
        });

        it('Throws when no URL is passed', async function () {
            await slackNotifications.send({}, null);
            assert(loggingErrorStub.callCount === 1);
        });
    });
});
