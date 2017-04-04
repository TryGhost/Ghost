// # Twitter URL Helper
// Usage: `{{twitter_url}}` or `{{twitter_url author.twitter}}`
//
// Output a url for a twitter username
//
// We use the name twitter_url to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    socialUrls = proxy.socialUrls,
    findKey = proxy.utils.findKey;

module.exports = function twitter_url(username, options) {
    if (!options) {
        options = username;
        username = findKey('twitter', this, options.data.blog);
    }

    if (username) {
        return socialUrls.twitterUrl(username);
    }

    return null;
};
