const {isPlainObject} = require('lodash');
const config = require('../../../shared/config');
const labs = require('../../services/labs');
const ghostVersion = require('../../lib/ghost-version');

module.exports = {
    docName: 'config',

    read: {
        permissions: false,
        query() {
            const billingUrl = config.get('host_settings:billing:enabled') ? config.get('host_settings:billing:url') : '';
            const domainUrl = config.get('host_settings:domain:enabled') ? config.get('host_settings:domain:url') : '';
            const updateUrl = config.get('host_settings:update:enabled') ? config.get('host_settings:update:url') : '';
            const response = {
                version: ghostVersion.full,
                environment: config.get('env'),
                database: config.get('database').client,
                mail: isPlainObject(config.get('mail')) ? config.get('mail').transport : '',
                useGravatar: !config.isPrivacyDisabled('useGravatar'),
                labs: labs.getAll(),
                clientExtensions: config.get('clientExtensions') || {},
                enableDeveloperExperiments: config.get('enableDeveloperExperiments') || false,
                stripeDirect: config.get('stripeDirect'),
                mailgunIsConfigured: config.get('bulkEmail') && config.get('bulkEmail').mailgun,
                emailAnalytics: config.get('emailAnalytics')
            };
            if (billingUrl) {
                response.billingUrl = billingUrl;
            }
            if (domainUrl) {
                response.domainUrl = domainUrl;
            }
            if (updateUrl) {
                response.updateUrl = updateUrl;
            }

            return response;
        }
    }
};
