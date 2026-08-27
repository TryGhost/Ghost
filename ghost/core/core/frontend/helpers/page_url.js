// ### Page URL Helper
//
// *Usage example:*
// `{{page_url 2}}`
//
// Returns the URL for the page specified in the current object context.
const metaData = require('../meta');
const getPaginatedUrl = metaData.getPaginatedUrl;

// We use the name page_url to match the helper for consistency:
// eslint-disable-next-line camelcase
module.exports = function page_url(page, options) {
  if (!options) {
    options = page;
    page = 1;
  }
  return getPaginatedUrl(page, options.data.root);
};
