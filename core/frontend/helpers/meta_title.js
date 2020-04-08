// # Meta Title Helper
// Usage: `{{meta_title}}`
//
// Page title used for sharing and SEO
const {metaData} = require('../services/proxy');
const {getMetaDataTitle} = metaData;

// We use the name meta_title to match the helper for consistency:
module.exports = function meta_title(options) { // eslint-disable-line camelcase
    return getMetaDataTitle(this, options.data.root, options);
};
