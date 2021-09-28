// This file contains everything that the helpers and frontend apps require from the core of Ghost
const hbs = require('./theme-engine/engine');
const settingsCache = require('../../shared/settings-cache');
const config = require('../../shared/config');

module.exports = {
    /**
     * Section one: Frontend Framework
     * These all belong to the frontend rendering layer
     */
    hbs: hbs,
    SafeString: hbs.SafeString,
    escapeExpression: hbs.escapeExpression,
    // The local template thing, should this be merged with the channels one?
    templates: require('./theme-engine/handlebars/template'),

    // Theme i18n is separate to common i18n
    themeI18n: require('./theme-engine/i18n'),

    // TODO: these need a more sensible home
    localUtils: require('./theme-engine/handlebars/utils'),

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
                resource.feature_image_caption = new hbs.SafeString(resource.feature_image_caption);
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
    urlService: require('./url'),
    urlUtils: require('../../shared/url-utils')
};
