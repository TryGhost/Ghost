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
var proxy = require('./proxy'),
    getPaginatedUrl = proxy.metaData.getPaginatedUrl;

module.exports = function page_url(page, options) {
    if (!options) {
        options = page;
        page = 1;
    }
    return getPaginatedUrl(page, options.data.root);
};
