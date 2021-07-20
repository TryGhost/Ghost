const ghostVersion = require('@tryghost/version');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const labs = require('../../../shared/labs');

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

    if (labs.isSet('oauthLogin') && settingsCache.get('oauth_client_id') && settingsCache.get('oauth_client_secret')) {
        // Only set the oauth flag if oauth is enabled to avoid API changes
        siteProperties.oauth = true;
    }

    if (config.get('client_sentry') && !config.get('client_sentry').disabled) {
        siteProperties.sentry_dsn = config.get('client_sentry').dsn;
        siteProperties.sentry_env = config.get('env');
    }

    return siteProperties;
};
