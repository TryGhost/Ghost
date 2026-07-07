const createFacade = require('../../../shared/container/create-facade');
const createSettingsHelpers = require('./create');

module.exports = createFacade('settingsHelpers', () => {
    const config = require('../../../shared/config');
    return createSettingsHelpers({
        settingsCache: require('../../../shared/settings-cache'),
        urlUtils: require('../../../shared/url-utils'),
        configView: config,
        labs: require('../../../shared/labs'),
        limits: require('../limits')
    });
});
