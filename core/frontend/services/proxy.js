// This file defines everything that helpers "require"
// With the exception of modules like lodash, Bluebird
// We can later refactor to enforce this something like we did in apps
const hbs = require('./theme-engine/engine');
const errors = require('@tryghost/errors');

const i18n = require('../../shared/i18n');
const logging = require('@tryghost/logging');
const settingsCache = require('../../shared/settings-cache');
const config = require('../../shared/config');

// Direct requires:
// - lodash
// - bluebird
// - downsize
// - moment-timezone
// - jsonpath

module.exports = {
    hbs: hbs,
    SafeString: hbs.SafeString,
    escapeExpression: hbs.escapeExpression,

    // TODO: Expose less of the API to make this safe
    api: require('../../server/api'),

    // TODO: Only expose "get"
    settingsCache: settingsCache,

    // These 3 are kind of core and required all the time
    errors,
    i18n,
    logging,

    // Theme i18n is separate to common i18n
    themeI18n: require('./theme-engine/i18n'),

    // This is used to detect if "isPost" is true in prevNext.
    checks: require('../../server/data/schema').checks,

    // Config!
    // Keys used:
    // isPrivacyDisabled & referrerPolicy used in ghost_head
    config: {
        get: config.get.bind(config),
        isPrivacyDisabled: config.isPrivacyDisabled.bind(config)
    },

    // Labs utils for enabling/disabling helpers
    labs: require('../../shared/labs'),

    // Things required from data/meta
    metaData: require('../meta'),

    // The local template thing, should this be merged with the channels one?
    templates: require('./theme-engine/handlebars/template'),

    // Various utils, needs cleaning up / simplifying
    socialUrls: require('@tryghost/social-urls'),
    blogIcon: require('../../server/lib/image').blogIcon,
    urlService: require('./url'),
    urlUtils: require('../../shared/url-utils'),
    localUtils: require('./theme-engine/handlebars/utils'),

    // Used by router service and {{get}} helper to prepare data for optimal usage in themes
    prepareContextResource(data) {
        (Array.isArray(data) ? data : [data]).forEach((resource) => {
            // feature_image_caption contains HTML, making it a SafeString spares theme devs from triple-curlies
            if (resource.feature_image_caption) {
                resource.feature_image_caption = new hbs.SafeString(resource.feature_image_caption);
            }
        });
    }
};
