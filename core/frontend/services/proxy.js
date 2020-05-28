// This file defines everything that helpers "require"
// With the exception of modules like lodash, Bluebird
// We can later refactor to enforce this something like we did in apps
const hbs = require('./themes/engine');
const errors = require('@tryghost/errors');

const {i18n} = require('../../server/lib/common');
const logging = require('../../shared/logging');
const settingsCache = require('../../server/services/settings/cache');
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
    themeI18n: require('./themes/i18n'),

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
    templates: require('./themes/handlebars/template'),

    // Various utils, needs cleaning up / simplifying
    socialUrls: require('@tryghost/social-urls'),
    blogIcon: require('../../server/lib/image/blog-icon'),
    urlService: require('./url'),
    urlUtils: require('../../shared/url-utils'),
    localUtils: require('./themes/handlebars/utils')
};
