const assert = require('assert');
const sinon = require('sinon');
const SlackNotifications = require('../lib/SlackNotifications');
const nock = require('nock');
const ObjectId = require('bson-objectid').default;

describe('SlackNotifications', function () {
    let slackNotifications;
    let loggingErrorStub;

    const config = {
        enabled: true,
        webhookUrl: 'https://slack-webhook.example'
    };

    beforeEach(function () {
        loggingErrorStub = sinon.stub();

        slackNotifications = new SlackNotifications({
            logging: {
                warn: () => {},
                error: loggingErrorStub
            },
            siteUrl: 'https://ghost.example',
            config
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

        it('Sends a notification to Slack for achieved ARR Milestone', async function () {
            await slackNotifications.notifyMilestoneReceived({
                id: ObjectId().toHexString(),
                name: 'arr-1000-usd',
                type: 'arr',
                createdAt: '2023-02-15T00:00:00.000Z',
                emailSentAt: '2023-02-15T00:00:00.000Z',
                value: 1000,
                currency: 'gbp'
            });

            const expectedResult = {
                text: 'ARR Milestone £1,000.00 reached!',
                unfurl_links: false,
                username: 'Ghost Milestone Service',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'New *ARR Milestone* achieved for <https://ghost.example|https://ghost.example>'
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: '*Milestone:*\n£1,000.00'
                            },
                            {
                                type: 'mrkdwn',
                                text: '*Current ARR:*\n£598.76'
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
            };

            assert(sendStub.calledOnce === true);
            assert(sendStub.calledWith(expectedResult, 'https://slack-webhook.example') === true);
        });

        it('Sends a notification to Slack for achieved Members Milestone', async function () {
            await slackNotifications.notifyMilestoneReceived({
                id: ObjectId().toHexString(),
                name: 'members-50000',
                type: 'members',
                createdAt: '2023-02-15T00:00:00.000Z',
                emailSentAt: null,
                value: 50000
            });

            const expectedResult = {
                text: 'Members Milestone 50,000 reached!',
                unfurl_links: false,
                username: 'Ghost Milestone Service',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'New *Members Milestone* achieved for <https://ghost.example|https://ghost.example>'
                        }
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
                                text: '*Current Members:*\n9,857'
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
            };

            assert(sendStub.calledOnce === true);
            assert(sendStub.calledWith(expectedResult, 'https://slack-webhook.example') === true);
        });

        it('Shows the correct reason for email not send when members have been imported recently');
        it('Shows the correct reason for email not send when last email was too recent');
    });

    describe('send', function () {
        it('Throws when invalid URL is passed', async function () {
            await slackNotifications.send('https://invalid-url', {});
            assert(loggingErrorStub.callCount === 1);
        });

        it('Throws when no URL is passed', async function () {
            await slackNotifications.send(null, {});
            assert(loggingErrorStub.callCount === 1);
        });
    });
});
