const createFacade = require('../../../shared/container/create-facade');
const createSlackNotificationsService = require('./create');

module.exports = createFacade('slackNotifications', () => {
    const config = require('../../../shared/config');
    return createSlackNotificationsService({
        domainEvents: require('../../lib/common/domain-events'),
        urlUtils: require('../../../shared/url-utils'),
        siteConfig: {hostSettings: config.get('hostSettings')}
    });
});
