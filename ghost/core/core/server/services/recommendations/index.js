const createFacade = require('../../../shared/container/create-facade');
const createRecommendationsService = require('./create');

module.exports = createFacade('recommendations', () => {
    const config = require('../../../shared/config');
    return createRecommendationsService({
        models: require('../../models'),
        domainEvents: require('../../lib/common/domain-events'),
        urlUtils: require('../../../shared/url-utils'),
        siteConfig: {publicContentPath: config.getContentPath('public')},
        deploymentConfig: config,
        mentions: require('../mentions'),
        staff: require('../staff'),
        settingsBREADService: require('../settings').getSettingsBREADServiceInstance(),
        oembedService: require('../oembed')
    });
});
