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
                brand: settingsCache.get('brand'),
                url: urlUtils.urlFor('home', true),
                version: ghostVersion.safe
            };

            // Brand is currently an experimental feature
            if (!config.get('enableDeveloperExperiments')) {
                delete response.brand;
            }

            return response;
        }
    }
};

module.exports = site;
