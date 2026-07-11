const {isPlainObject} = require('lodash');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const databaseInfo = require('../../data/db/info');
const ghostVersion = require('@tryghost/version');

const tinybirdStatsPayloadProperties = [
    'endpoint',
    'endpointBrowser',
    'version',
    'datasource'
];

const tinybirdLocalStatsPayloadProperties = [
    'enabled',
    'endpoint',
    'datasource'
];

const copyPayloadProperties = (target, source, properties) => {
    for (const property of properties) {
        if (Object.prototype.hasOwnProperty.call(source, property)) {
            target[property] = source[property];
        }
    }
};

const getTinybirdStatsPayload = (statsConfig, siteUuid) => {
    const statsPayload = {};

    copyPayloadProperties(statsPayload, statsConfig, tinybirdStatsPayloadProperties);

    statsPayload.id = siteUuid;

    if (isPlainObject(statsConfig.local)) {
        const localStatsPayload = {};
        copyPayloadProperties(localStatsPayload, statsConfig.local, tinybirdLocalStatsPayloadProperties);

        if (Object.keys(localStatsPayload).length > 0) {
            statsPayload.local = localStatsPayload;
        }
    }

    return statsPayload;
};

module.exports = function getConfigProperties() {
    const configProperties = {
        version: process.env.GHOST_BUILD_VERSION || ghostVersion.original,
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
        klipy: config.get('klipy'),
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
        configProperties.stats = getTinybirdStatsPayload(statsConfig, siteUuid);
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
