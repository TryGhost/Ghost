// # Meta Title Helper
// Usage: `{{meta_title}}`
//
// Page title used for sharing and SEO
const metaData = require('../meta');
const {getMetaDataTitle} = metaData;

// We use the name meta_title to match the helper for consistency:
// eslint-disable-next-line camelcase
module.exports = function meta_title(options) {
    return getMetaDataTitle(this, options.data.root, options);
};
