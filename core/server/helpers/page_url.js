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
    errors.logWarn('Warning: pageUrl is deprecated, please use page_url instead\n' +
        'The helper pageUrl has been replaced with page_url in Ghost 0.4.2, and will be removed entirely in Ghost 0.6\n' +
        'In your theme\'s pagination.hbs file, pageUrl should be renamed to page_url');

    /*jshint unused:false*/
    var self = this;

    return page_url.call(self, context, block);
};

module.exports = page_url;
module.exports.deprecated = pageUrl;
