// # Facebook URL Helper
// Usage: `{{facebook_url}}` or `{{facebook_url author.facebook}}`
//
// Output a url for a twitter username
//
// We use the name facebook_url to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    socialUrls = proxy.socialUrls,
    findKey = proxy.utils.findKey;

module.exports = function facebook_url(username, options) {
    if (!options) {
        options = username;
        username = findKey('facebook', this, options.data.blog);
    }

    if (username) {
        return socialUrls.facebookUrl(username);
    }

    return null;
};
