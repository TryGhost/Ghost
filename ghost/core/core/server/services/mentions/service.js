const createFacade = require('../../../shared/container/create-facade');
const createMentionsService = require('./create');

module.exports = createFacade('mentions', () => createMentionsService({
    models: require('../../models'),
    events: require('../../lib/common/events'),
    domainEvents: require('../../lib/common/domain-events'),
    urlUtils: require('../../../shared/url-utils'),
    settingsCache: require('../../../shared/settings-cache'),
    urlService: require('../url'),
    jobsService: require('../mentions-jobs')
}));
