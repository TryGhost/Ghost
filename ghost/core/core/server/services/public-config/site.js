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
        cover_image: settingsCache.get('cover_image'),
        accent_color: settingsCache.get('accent_color'),
        locale: settingsCache.get('locale'),
        url: urlUtils.urlFor('home', true),
        version: ghostVersion.safe,
        allow_external_signup: settingsCache.get('allow_self_signup') && !(settingsCache.get('portal_signup_checkbox_required') && settingsCache.get('portal_signup_terms_html')),
        site_uuid: settingsCache.get('site_uuid'),
        // The React admin auth screens render pre-authentication, so the flag
        // has to be distributed via the (public) site endpoint rather than the
        // authenticated config endpoint.
        authX: labs.isSet('authX')
    };

    if (config.get('client_sentry') && !config.get('client_sentry').disabled) {
        siteProperties.sentry_dsn = config.get('client_sentry').dsn;

        let environment = config.get('PRO_ENV');
        if (!environment) {
            environment = config.get('env');
        }

        siteProperties.sentry_env = environment;
    }

    return siteProperties;
};
