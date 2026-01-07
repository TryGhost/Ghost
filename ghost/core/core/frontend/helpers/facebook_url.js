// # Facebook URL Helper
// Usage: `{{facebook_url}}` or `{{facebook_url author.facebook}}`
//
// Output a url for a facebook username
const {socialUrls} = require('../services/proxy');
const {localUtils} = require('../services/handlebars');

// We use the name facebook_url to match the helper for consistency:
/**
 * @deprecated Use {{social_url type="facebook"}} instead.
 */
module.exports = function facebook_url(username, options) { // eslint-disable-line camelcase
    if (!options) {
        options = username;
        username = localUtils.findKey('facebook', this, options.data.site);
    }

    if (username) {
        return socialUrls.facebook(username);
    }

    return null;
};
