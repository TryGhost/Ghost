// # {{member_rss_url}} Helper
// Usage: `{{member_rss_url}}`, `{{member_rss_url path="/author/john/rss/"}}`
//
// Returns the authenticated RSS URL for the current member
// Should be used when a member is present in the context, e.g. `{{#if @member}}{{member_rss_url}}{{/if}}`

const rssUrlHelper = require('../../server/services/members/rss-url-helper');
const {SafeString} = require('../services/handlebars');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidData: 'The {{member_rss_url}} helper was used outside of a member context.'
};

module.exports = function member_rss_url(options) {
    const member = options.data.root.member;
    const path = options && options.hash && options.hash.path;

    if (!member) {
        throw new errors.IncorrectUsageError({message: tpl(messages.invalidData)});
    }

    const url = rssUrlHelper.generateMemberRSSUrl(member, path);
    return new SafeString(url);
};