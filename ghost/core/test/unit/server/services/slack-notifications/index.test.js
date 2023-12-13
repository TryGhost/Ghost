const {configUtils} = require('../../../../utils/e2e-framework');
const assert = require('assert/strict');
const slackNotifications = require('../../../../../core/server/services/slack-notifications');
const {SlackNotifications} = require('@tryghost/slack-notifications');

describe('Slack Notifications Service', function () {
    beforeEach(function () {
        configUtils.set('hostSettings', {milestones: {enabled: true, url: 'https://testhooks.slack.com/'}});
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    it('Exposes an instance of SlackNotifications', async function () {
        await slackNotifications.init();

        assert(slackNotifications.api instanceof SlackNotifications);
    });
});
