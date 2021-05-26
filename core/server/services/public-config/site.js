const ghostVersion = require('../../lib/ghost-version');
const settingsCache = require('../settings/cache');
const urlUtils = require('../../../shared/url-utils');

module.exports = function getSiteProperties() {
    const siteProperties = {
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
        siteProperties.oauth = true;
    }

    return siteProperties;
};
