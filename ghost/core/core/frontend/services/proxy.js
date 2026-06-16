// This file contains everything that the helpers and frontend apps require from the core of Ghost
const settingsCache = require('../../shared/settings-cache');
const config = require('../../shared/config');
const settingsHelpers = require('../../server/services/settings-helpers');
const internalKeys = require('../../server/services/internal-keys').default;
const logging = require('@tryghost/logging');

// Require from the handlebars framework
const {SafeString} = require('./handlebars');

module.exports = {
    getFrontendKey: async () => {
        try {
            const key = await internalKeys.get('ghost-internal-frontend');
            return key.secret;
        } catch (err) {
            logging.error({
                event: {name: 'frontend.load-internal-key.error'},
                err
            }, 'Unable to find the internal frontend key');
            return null;
        }
    },

    /**
     * Section two: data manipulation
     * Stuff that modifies API data (SDK layer)
     */
    socialUrls: require('@tryghost/social-urls'),
    blogIcon: require('../../server/lib/image').blogIcon,
    cachedImageSizeFromUrl: require('../../server/lib/image').cachedImageSizeFromUrl,
    // Used by router service and {{get}} helper to prepare data for optimal usage in themes
    prepareContextResource(data) {
        (Array.isArray(data) ? data : [data]).forEach((resource) => {
            // feature_image_caption contains HTML, making it a SafeString spares theme devs from triple-curlies
            if (resource.feature_image_caption) {
                resource.feature_image_caption = new SafeString(resource.feature_image_caption);
            }

            // some properties are extracted to local template data to force one way of using it
            delete resource.show_title_and_feature_image;
        });
    },

    /**
     * Section three: Core API
     * Parts of Ghost core that the frontend currently needs
     */

    // Config! Keys used:
    // isPrivacyDisabled & referrerPolicy used in ghost_head
    config: {
        get: config.get.bind(config),
        isPrivacyDisabled: config.isPrivacyDisabled.bind(config)
    },

    // TODO: Only expose "get"
    settingsCache: settingsCache,

    // Settings helpers for calculated settings
    settingsHelpers: {
        isWebAnalyticsEnabled: settingsHelpers.isWebAnalyticsEnabled.bind(settingsHelpers)
    },

    // TODO: Expose less of the API to make this safe
    api: require('../../server/api').endpoints,

    // Labs utils for enabling/disabling helpers
    labs: require('../../shared/labs'),
    // Gift links service — the /g/ reader controller records reads through its
    // middleware. Crossed via this seam (not a direct require) per the
    // frontend→server boundary rule.
    giftLinks: require('../../server/services/gift-links'),
    // URGH... Yuk (unhelpful comment :D)
    urlService: require('../../server/services/url'),
    urlUtils: require('../../shared/url-utils')
};
