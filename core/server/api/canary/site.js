const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../../shared/url-utils');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            const response = {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                logo: settingsCache.get('logo'),
                icon: settingsCache.get('icon'),
                accent_color: settingsCache.get('accent_color'),
                url: urlUtils.urlFor('home', true),
                version: ghostVersion.safe
            };
            if (settingsCache.get('oauth_client_id') && settingsCache.get('oauth_client_secret')) {
                // Only set the oauth flag if oauth is enabled to avoid API changes
                response.oauth = true;
            }

            return response;
        }
    }
};

module.exports = site;
