const createFacade = require('../../../shared/container/create-facade');
const createStripeService = require('./create');

module.exports = createFacade('stripe', () => {
    const config = require('../../../shared/config');
    return createStripeService({
        models: require('../../models'),
        settingsCache: require('../../../shared/settings-cache'),
        settingsHelpers: require('../settings-helpers'),
        urlUtils: require('../../../shared/url-utils'),
        events: require('../../lib/common/events'),
        donations: require('../donations'),
        gifts: require('../gifts'),
        staff: require('../staff'),
        deploymentConfig: config,
        isTestEnv: () => config.isTestEnv(),
        labs: require('../../../shared/labs'),
        membersService: require('../members')
    });
});
