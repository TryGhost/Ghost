const createFacade = require('../../../shared/container/create-facade');
const createMemberWelcomeEmailService = require('./create');

module.exports = createFacade('memberWelcomeEmails', () => createMemberWelcomeEmailService({
    models: require('../../models'),
    events: require('../../lib/common/events'),
    settingsCache: require('../../../shared/settings-cache')
}));
