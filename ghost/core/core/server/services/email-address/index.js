const createFacade = require('../../../shared/container/create-facade');
const createEmailAddressService = require('./create');

module.exports = createFacade('emailAddress', () => {
    const config = require('../../../shared/config');
    return createEmailAddressService({
        labs: require('../../../shared/labs'),
        settingsHelpers: require('../settings-helpers'),
        configView: config
    });
});
