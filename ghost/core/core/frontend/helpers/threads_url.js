// # Threads URL Helper
// Usage: `{{threads_url}}` or `{{threads_url author.threads}}`
//
// Output a url for a threads username

const {socialUrls} = require('../services/proxy');
const {localUtils} = require('../services/handlebars');

// We use the name threads_url to match the helper for consistency:
module.exports = function threads_url(username, options) { // eslint-disable-line camelcase
    if (!options) {
        options = username;
        username = localUtils.findKey('threads', this, options.data.site);
    }

    if (username) {
        return socialUrls.threads(username);
    }

    return null;
};
