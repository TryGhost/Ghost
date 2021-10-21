// This file contains everything that the helpers and frontend apps require from the core of Ghost
const settingsCache = require('../../shared/settings-cache');
const config = require('../../shared/config');

// Require from the rendering framework
const {SafeString} = require('./rendering');

module.exports = {
    /**
     * Section two: data manipulation
     * Stuff that modifies API data (SDK layer)
     */
    metaData: require('../meta'),
    socialUrls: require('@tryghost/social-urls'),
    blogIcon: require('../../server/lib/image').blogIcon,
    // Used by router service and {{get}} helper to prepare data for optimal usage in themes
    prepareContextResource(data) {
        (Array.isArray(data) ? data : [data]).forEach((resource) => {
            // feature_image_caption contains HTML, making it a SafeString spares theme devs from triple-curlies
            if (resource.feature_image_caption) {
                resource.feature_image_caption = new SafeString(resource.feature_image_caption);
            }
        });
    },
    // This is used to decide e.g. if a JSON object is a Post, Page, Tag etc
    checks: require('../../server/data/schema').checks,

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

    // TODO: Expose less of the API to make this safe
    api: require('../../server/api'),

    // Labs utils for enabling/disabling helpers
    labs: require('../../shared/labs'),
    // URGH... Yuk (unhelpful comment :D)
    urlService: require('../../server/services/url'),
    urlUtils: require('../../shared/url-utils')
};
