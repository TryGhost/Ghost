// # Facebook URL Helper
// Usage: `{{facebook_url}}` or `{{facebook_url author.facebook}}`
//
// Output a url for a facebook username
var proxy = require('./proxy'),
    socialUrls = proxy.socialUrls,
    localUtils = proxy.localUtils;

// We use the name facebook_url to match the helper for consistency:
module.exports = function facebook_url(username, options) { // eslint-disable-line camelcase
    if (!options) {
        options = username;
        username = localUtils.findKey('facebook', this, options.data.blog);
    }

    if (username) {
        return socialUrls.facebook(username);
    }

    return null;
};
