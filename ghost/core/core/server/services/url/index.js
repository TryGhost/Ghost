const createFacade = require('../../../shared/container/create-facade');
const createUrlService = require('./create');

module.exports = createFacade('urlService', () => {
    const config = require('../../../shared/config');
    return createUrlService({
        siteConfig: {dataContentPath: config.getContentPath('data')},
        deploymentConfig: config,
        models: require('../../models')
    });
});
