// # Meta Title Helper
// Usage: `{{meta_title}}`
//
// Page title used for sharing and SEO
//
// We use the name meta_title to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    getMetaDataTitle = proxy.metaData.getMetaDataTitle;

function meta_title(options) {
    return getMetaDataTitle(this, options.data.root);
}

module.exports = meta_title;
