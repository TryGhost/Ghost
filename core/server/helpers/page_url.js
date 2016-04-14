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
var errors          = require('../errors'),
    i18n            = require('../i18n'),
    getPaginatedUrl = require('../data/meta/paginated_url'),
    page_url,
    pageUrl;

page_url = function (page, options) {
    if (!options) {
        options = page;
        page = 1;
    }
    return getPaginatedUrl(page, options.data.root);
};

// ### Page URL Helper: DEPRECATED
//
// *Usage example:*
// `{{pageUrl 2}}`
//
// Returns the URL for the page specified in the current object
// context. This helper is deprecated and will be removed in future versions.
//
pageUrl = function (pageNum, options) {
    errors.logWarn(i18n.t('warnings.helpers.page_url.isDeprecated'));

    /*jshint unused:false*/
    var self = this;

    return page_url.call(self, pageNum, options);
};

module.exports = page_url;
module.exports.deprecated = pageUrl;
