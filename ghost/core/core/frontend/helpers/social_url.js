// # Social URL Helper
// Usage: `{{social_url type="platform"}}` (e.g., type="facebook", type="twitter")
//
// Output a url for a social media username defined in site settings.
const {socialUrls} = require('../services/proxy');
const {localUtils} = require('../services/handlebars');

// We use the name social_url to match the helper for consistency:
module.exports = function social_url(options) { // eslint-disable-line camelcase
    // Check for required hash option 'type'
    if (!options || !options.hash || !options.hash.type) {
        return null;
    }

    const platform = options.hash.type;
    const siteData = options.data && options.data.site;

    if (!siteData) {
        return null;
    }

    // Use localUtils.findKey for potential context fallback, though siteData is primary
    const username = localUtils.findKey(platform, this, siteData);

    // Check if the platform is supported by socialUrls and the username exists
    if (username && typeof socialUrls[platform] === 'function') {
        return socialUrls[platform](username);
    }

    return null;
};
