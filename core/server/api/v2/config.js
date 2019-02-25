const {isPlainObject} = require('lodash');
const config = require('../../config');
const labs = require('../../services/labs');
const ghostVersion = require('../../lib/ghost-version');

module.exports = {
    docName: 'config',

    read: {
        permissions: false,
        query() {
            return {
                version: ghostVersion.full,
                environment: config.get('env'),
                database: config.get('database').client,
                mail: isPlainObject(config.get('mail')) ? config.get('mail').transport : '',
                useGravatar: !config.isPrivacyDisabled('useGravatar'),
                labs: labs.getAll(),
                clientExtensions: config.get('clientExtensions') || {},
                enableDeveloperExperiments: config.get('enableDeveloperExperiments') || false
            };
        }
    }
};
