// # Meta Description Helper
// Usage: `{{meta_description}}`
//
// Page description used for sharing and SEO
const metaData = require('../meta');
const { getMetaDataDescription } = metaData;

// We use the name meta_description to match the helper for consistency:
// eslint-disable-next-line camelcase
module.exports = function meta_description(options) {
  options = options || {};

  return getMetaDataDescription(this, options.data.root) || '';
};
