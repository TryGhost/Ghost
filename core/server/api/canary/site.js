const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../../shared/url-utils');
const config = require('../../../shared/config');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            const response = {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                logo: settingsCache.get('logo'),
                accent_color: settingsCache.get('accent_color'),
                url: urlUtils.urlFor('home', true),
                version: ghostVersion.safe
            };

            // accent_color is currently an experimental feature
            if (!config.get('enableDeveloperExperiments')) {
                delete response.accent_color;
            }

            return response;
        }
    }
};

module.exports = site;
