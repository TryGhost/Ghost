// # {{member_rss_url}} Helper
// Usage: `{{member_rss_url}}`
//
// Returns the authenticated RSS URL for the current member.
// Only works when member is logged in, returns empty string otherwise.

const {SafeString} = require('../services/handlebars');
const logging = require('@tryghost/logging');

module.exports = function member_rss_url(options) { // eslint-disable-line camelcase
    let result;

    try {
        // Get member from the handlebars context
        const member = options.data.root.member;

        if (!member || !member.rss_url) {
            return '';
        }

        result = new SafeString(member.rss_url);
    } catch (error) {
        logging.error('[member_rss_url helper] Error generating RSS URL:', error);
        result = '';
    }

    return result;
};