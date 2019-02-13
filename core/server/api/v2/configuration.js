const Promise = require('bluebird');
const {isPlainObject} = require('lodash');
const urlService = require('../../services/url');
const config = require('../../config');
const labs = require('../../services/labs');
const settingsCache = require('../../services/settings/cache');
const ghostVersion = require('../../lib/ghost-version');

function fetchAvailableTimezones() {
    const timezones = require('../../data/timezones.json');
    return timezones;
}

function getAboutConfig() {
    return {
        version: ghostVersion.full,
        environment: config.get('env'),
        database: config.get('database').client,
        mail: isPlainObject(config.get('mail')) ? config.get('mail').transport : ''
    };
}

function getBaseConfig() {
    return {
        useGravatar: !config.isPrivacyDisabled('useGravatar'),
        publicAPI: labs.isSet('publicAPI'),
        blogUrl: urlService.utils.urlFor('home', true),
        blogTitle: settingsCache.get('title'),
        clientExtensions: config.get('clientExtensions'),
        enableDeveloperExperiments: config.get('enableDeveloperExperiments')
    };
}

module.exports = {
    docName: 'configuration',
    read: {
        permissions: false,
        data: [
            'key'
        ],
        query({data}) {
            if (!data.key) {
                return Promise.resolve(getBaseConfig());
            }

            if (data.key === 'about') {
                return Promise.resolve(getAboutConfig());
            }

            // Timezone endpoint
            if (data.key === 'timezones') {
                return Promise.resolve(fetchAvailableTimezones());
            }

            return Promise.resolve();
        }
    }
};
