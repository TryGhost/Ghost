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
                portal: config.get('portal')
            };
            if (billingUrl) {
                response.billingUrl = billingUrl;
            }
            return response;
        }
    }
};
