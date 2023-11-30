const {configUtils} = require('../../../../utils/e2e-framework');
const assert = require('assert/strict');
const nock = require('nock');
const DomainEvents = require('@tryghost/domain-events');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');
const slackNotifications = require('../../../../../core/server/services/slack-notifications');

describe('Slack Notifications Service', function () {
    let scope;

    beforeEach(function () {
        configUtils.set('hostSettings', {milestones: {enabled: true, url: 'https://testhooks.slack.com/'}});

        scope = nock('https://testhooks.slack.com/')
            .post('/')
            .reply(200, {ok: true});
    });

    afterEach(async function () {
        nock.cleanAll();
        await configUtils.restore();
    });

    it('Can send a milestone created event', async function () {
        await slackNotifications.init();

        DomainEvents.dispatch(MilestoneCreatedEvent.create({
            milestone: {
                type: 'arr',
                currency: 'usd',
                name: 'arr-100-usd',
                value: 100,
                createdAt: new Date(),
                emailSentAt: new Date()
            },
            meta: {
                currentValue: 105
            }
        }));

        // Wait for the dispatched events (because this happens async)
        await DomainEvents.allSettled();

        assert.equal(scope.isDone(), true);
    });
});
