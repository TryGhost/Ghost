const createFacade = require('../../../shared/container/create-facade');
const createStaffService = require('./create');

module.exports = createFacade('staff', () => createStaffService({
    models: require('../../models'),
    domainEvents: require('../../lib/common/domain-events'),
    settingsCache: require('../../../shared/settings-cache'),
    urlUtils: require('../../../shared/url-utils'),
    memberAttribution: require('../member-attribution'),
    settingsHelpers: require('../settings-helpers'),
    labs: require('../../../shared/labs')
}));
