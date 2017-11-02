// # Meta Description Helper
// Usage: `{{meta_description}}`
//
// Page description used for sharing and SEO
var proxy = require('./proxy'),
    getMetaDataDescription = proxy.metaData.getMetaDataDescription;

// We use the name meta_description to match the helper for consistency:
module.exports = function meta_description(options) { // eslint-disable-line camelcase
    options = options || {};

    return getMetaDataDescription(this, options.data.root) || '';
};
