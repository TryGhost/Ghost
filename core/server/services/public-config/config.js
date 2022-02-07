const {isPlainObject} = require('lodash');
const config = require('../../../shared/config');
const labs = require('../../../shared/labs');
const databaseInfo = require('../../data/db/info');
const ghostVersion = require('@tryghost/version');

module.exports = function getConfigProperties() {
    const configProperties = {
        version: ghostVersion.full,
        environment: config.get('env'),
        database: databaseInfo.getEngine(),
        mail: isPlainObject(config.get('mail')) ? config.get('mail').transport : '',
        useGravatar: !config.isPrivacyDisabled('useGravatar'),
        labs: labs.getAll(),
        clientExtensions: config.get('clientExtensions') || {},
        enableDeveloperExperiments: config.get('enableDeveloperExperiments') || false,
        stripeDirect: config.get('stripeDirect'),
        mailgunIsConfigured: !!(config.get('bulkEmail') && config.get('bulkEmail').mailgun),
        emailAnalytics: config.get('emailAnalytics'),
        hostSettings: config.get('hostSettings'),
        tenor: config.get('tenor')
    };

    const billingUrl = config.get('hostSettings:billing:enabled') ? config.get('hostSettings:billing:url') : '';
    if (billingUrl) {
        configProperties.billingUrl = billingUrl;
    }

    return configProperties;
};
