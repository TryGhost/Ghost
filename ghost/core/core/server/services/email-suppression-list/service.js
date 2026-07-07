const createFacade = require('../../../shared/container/create-facade');
const createEmailSuppressionList = require('./create');

module.exports = createFacade('emailSuppressionList', () => {
    const config = require('../../../shared/config');
    return createEmailSuppressionList({
        models: require('../../models'),
        settingsCache: require('../../../shared/settings-cache'),
        configView: config,
        labs: require('../../../shared/labs')
    });
});
