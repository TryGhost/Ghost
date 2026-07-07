const createFacade = require('../../../shared/container/create-facade');
const createMemberAttributionService = require('./create');

module.exports = createFacade('memberAttribution', () => createMemberAttributionService({
    models: require('../../models'),
    urlUtils: require('../../../shared/url-utils'),
    settingsCache: require('../../../shared/settings-cache'),
    urlService: require('../url')
}));
