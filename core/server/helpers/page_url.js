// ### Page URL Helper
//
// *Usage example:*
// `{{page_url 2}}`
//
// Returns the URL for the page specified in the current object
// context.
//
// We use the name page_url to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var config          = require('../config'),
    errors          = require('../errors'),
    i18n            = require('../i18n'),
    page_url,
    pageUrl;

page_url = function (context, block) {
    /*jshint unused:false*/
    var url = config.paths.subdir;

    if (this.tagSlug !== undefined) {
        url += '/' + config.routeKeywords.tag + '/' + this.tagSlug;
    }

    if (this.authorSlug !== undefined) {
        url += '/' + config.routeKeywords.author + '/' + this.authorSlug;
    }

    if (context > 1) {
        url += '/' + config.routeKeywords.page + '/' + context;
    }

    url += '/';

    return url;
};

// ### Page URL Helper: DEPRECATED
//
// *Usage example:*
// `{{pageUrl 2}}`
//
// Returns the URL for the page specified in the current object
// context. This helper is deprecated and will be removed in future versions.
//
pageUrl = function (context, block) {
    errors.logWarn(i18n.t('warnings.helpers.page_url.isDeprecated'));

    /*jshint unused:false*/
    var self = this;

    return page_url.call(self, context, block);
};

module.exports = page_url;
module.exports.deprecated = pageUrl;
