const {isPlainObject} = require('lodash');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const databaseInfo = require('../../data/db/info');
const ghostVersion = require('@tryghost/version');

module.exports = function getConfigProperties() {
    const configProperties = {
        version: ghostVersion.original,
        environment: config.get('env'),
        database: databaseInfo.getEngine(),
        mail: isPlainObject(config.get('mail')) ? config.get('mail').transport : '',
        useGravatar: !config.isPrivacyDisabled('useGravatar'),
        labs: labs.getAll(),
        clientExtensions: config.get('clientExtensions') || {},
        enableDeveloperExperiments: config.get('enableDeveloperExperiments') || false,
        stripeDirect: config.get('stripeDirect'),
        mailgunIsConfigured: !!(config.get('bulkEmail') && config.get('bulkEmail').mailgun),
        emailAnalytics: config.get('emailAnalytics:enabled'),
        hostSettings: config.get('hostSettings'),
        tenor: config.get('tenor'),
        pintura: config.get('pintura'),
        signupForm: config.get('signupForm'),
        security: config.get('security')
    };

    if (config.get('explore') && config.get('explore:testimonials_url')) {
        configProperties.exploreTestimonialsUrl = config.get('explore:testimonials_url');
    }

    if (config.get('tinybird') && config.get('tinybird:stats')) {
        const statsConfig = config.get('tinybird:stats');
        const siteUuid = statsConfig.id || settingsCache.get('site_uuid');
        configProperties.stats = {
            ...statsConfig,
            id: siteUuid
        };
    }

    if (labs.isSet('featurebaseFeedback') && config.get('featurebase')) {
        // Expose only the public featurebase config properties
        configProperties.featurebase = {
            enabled: config.get('featurebase:enabled'),
            organization: config.get('featurebase:organization')
        };
    }

    return configProperties;
};
