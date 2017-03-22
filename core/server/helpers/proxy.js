// This file defines everything that helpers "require"
// With the exception of modules like lodash, Bluebird
// We can later refactor to enforce this something like we do in apps
var hbs = require('../themes/engine'),
    _ = require('lodash'),
    config = require('../config');

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

    // Expose less of the API?
    api: require('../api'),
    settingsCache: require('../settings/cache'),

    // These 3 are kind of core and required all the time
    errors: require('../errors'),
    i18n: require('../i18n'),
    logging: require('../logging'),

    // This is used to detect if "isPost" is true in prevNext.
    checks: require('../data/schema').checks,

    // Config!
    // Keys used:
    // minifyAssets in asset helper
    // isPrivacyDisabled & referrerPolicy used in ghost_head
    // Subscribe app uses routeKeywords
    config: config,

    // Labs utils for enabling/disabling helpers
    labs: require('../utils/labs'),

    // System for apps to hook into one day maybe
    filters: require('../filters'),

    // Things required from data/meta
    // @TODO: clean this up
    metaData: {
        get: require('../data/meta'), // ghost_head
        getAssetUrl: require('../data/meta/asset_url'), // asset
        getMetaDataExcerpt: require('../data/meta/excerpt'), // excerpt
        getMetaDataDescription: require('../data/meta/description'), // meta_desc
        getMetaDataTitle: require('../data/meta/title'), // meta_title
        getPaginatedUrl: require('../data/meta/paginated_url'), // page_url
        getMetaDataUrl: require('../data/meta/url') // url
    },

    // The local template thing, should this be merged with the channels one?
    templates: require('./template'),

    // Various utils, needs cleaning up / simplifying
    socialUrls: require('../utils/social-urls'),
    url: require('../utils').url,
    utils: {
        // @TODO this can probably be made more generic and used in more places
        findKey: function findKey(key, object, data) {
            if (object && _.has(object, key) && !_.isEmpty(object[key])) {
                return object[key];
            }

            if (data && _.has(data, key) && !_.isEmpty(data[key])) {
                return data[key];
            }

            return null;
        },
        parseVisibility: function parseVisibility(options) {
            if (!options.hash.visibility) {
                return ['public'];
            }

            return _.map(options.hash.visibility.split(','), _.trim);
        }
    },
    // @TODO restructure this
    visibilityFilter: require('../utils/visibility-filter')
};
