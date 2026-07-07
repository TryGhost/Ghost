const createFacade = require('../../../shared/container/create-facade');
const createGiftService = require('./create');

module.exports = createFacade('gifts', () => createGiftService({
    models: require('../../models'),
    domainEvents: require('../../lib/common/domain-events'),
    settingsCache: require('../../../shared/settings-cache'),
    urlUtils: require('../../../shared/url-utils'),
    settingsHelpers: require('../settings-helpers'),
    tiers: require('../tiers'),
    staff: require('../staff'),
    membersService: require('../members'),
    t: require('../i18n').t
}));
