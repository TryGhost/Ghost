// This file defines everything that helpers "require"
// With the exception of modules like lodash, Bluebird
// We can later refactor to enforce this something like we do in apps
var hbs = require('../services/themes/engine'),
    settingsCache = require('../../server/services/settings/cache'),
    config = require('../../server/config');

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
    errors: require('../../server/lib/common/errors'),
    i18n: require('../../server/lib/common/i18n'),
    logging: require('../../server/lib/common/logging'),

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
    labs: require('../../server/services/labs'),

    // Things required from data/meta
    metaData: {
        get: require('../meta'), // ghost_head
        getAssetUrl: require('../meta/asset_url'), // asset
        getMetaDataExcerpt: require('../meta/excerpt'), // excerpt
        getMetaDataDescription: require('../meta/description'), // meta_desc
        getMetaDataTitle: require('../meta/title'), // meta_title
        getPaginatedUrl: require('../meta/paginated_url'), // page_url
        getMetaDataUrl: require('../meta/url') // url
    },

    // The local template thing, should this be merged with the channels one?
    templates: require('./template'),

    // Various utils, needs cleaning up / simplifying
    socialUrls: require('@tryghost/social-urls'),
    blogIcon: require('../../server/lib/image/blog-icon'),
    urlService: require('../services/url'),
    urlUtils: require('../../server/lib/url-utils'),
    localUtils: require('./utils')
};
