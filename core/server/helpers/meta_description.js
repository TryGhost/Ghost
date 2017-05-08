// # Meta Description Helper
// Usage: `{{meta_description}}`
//
// Page description used for sharing and SEO
//
// We use the name meta_description to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    getMetaDataDescription = proxy.metaData.getMetaDataDescription;

function meta_description(options) {
    options = options || {};

    return getMetaDataDescription(this, options.data.root) || '';
}

module.exports = meta_description;
