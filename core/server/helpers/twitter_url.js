// # Twitter URL Helper
// Usage: `{{twitter_url}}` or `{{twitter_url author.twitter}}`
//
// Output a url for a twitter username
var proxy = require('./proxy'),
    socialUrls = proxy.socialUrls,
    findKey = proxy.utils.findKey;

// We use the name twitter_url to match the helper for consistency:
module.exports = function twitter_url(username, options) { // eslint-disable-line camelcase
    if (!options) {
        options = username;
        username = findKey('twitter', this, options.data.blog);
    }

    if (username) {
        return socialUrls.twitterUrl(username);
    }

    return null;
};
