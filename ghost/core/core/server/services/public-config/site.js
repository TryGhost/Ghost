const ghostVersion = require('@tryghost/version');
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

module.exports = function getSiteProperties() {
    const siteProperties = {
        title: settingsCache.get('title'),
        description: settingsCache.get('description'),
        logo: settingsCache.get('logo'),
        icon: settingsCache.get('icon'),
        cover_image: settingsCache.get('cover_image'),
        accent_color: settingsCache.get('accent_color'),
        locale: settingsCache.get('locale'),
        url: urlUtils.urlFor('home', true),
        version: ghostVersion.safe,
        allow_external_signup: settingsCache.get('allow_self_signup') && !(settingsCache.get('portal_signup_checkbox_required') && settingsCache.get('portal_signup_terms_html'))
    };

    if (config.get('client_sentry') && !config.get('client_sentry').disabled) {
        siteProperties.sentry_dsn = config.get('client_sentry').dsn;
        siteProperties.sentry_env = config.get('env');
    }

    return siteProperties;
};
