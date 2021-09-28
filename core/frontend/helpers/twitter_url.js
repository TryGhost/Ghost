// # Twitter URL Helper
// Usage: `{{twitter_url}}` or `{{twitter_url author.twitter}}`
//
// Output a url for a twitter username
const {socialUrls} = require('../services/proxy');
const {localUtils} = require('../services/rendering');

// We use the name twitter_url to match the helper for consistency:
module.exports = function twitter_url(username, options) { // eslint-disable-line camelcase
    if (!options) {
        options = username;
        username = localUtils.findKey('twitter', this, options.data.site);
    }

    if (username) {
        return socialUrls.twitter(username);
    }

    return null;
};
