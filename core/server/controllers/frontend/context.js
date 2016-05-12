/**
 * # Response context
 *
 * Figures out which context we are currently serving. The biggest challenge with determining this
 * is that the only way to determine whether or not we are a post, or a page, is with data after all the
 * data for the template has been retrieved.
 *
 * Contexts are determined based on 3 pieces of information
 * 1. res.locals.relativeUrl - which never includes the subdirectory
 * 2. req.params.page - always has the page parameter, regardless of if the URL contains a keyword (RSS pages don't)
 * 3. data - used for telling the difference between posts and pages
 */

var config = require('../../config'),

    // Context patterns, should eventually come from Channel configuration
    privatePattern = new RegExp('^\\/' + config.routeKeywords.private + '\\/'),
    subscribePattern = new RegExp('^\\/' + config.routeKeywords.subscribe + '\\/'),
    rssPattern = new RegExp('^\\/rss\\/'),
    homePattern = new RegExp('^\\/$');

function setResponseContext(req, res, data) {
    var pageParam = req.params && req.params.page !== undefined ? parseInt(req.params.page, 10) : 1;

    res.locals = res.locals || {};
    res.locals.context = [];

    // If we don't have a relativeUrl, we can't detect the context, so return
    if (!res.locals.relativeUrl) {
        return;
    }

    // Paged context - special rule
    if (!isNaN(pageParam) && pageParam > 1) {
        res.locals.context.push('paged');
    }

    // Home context - special rule
    if (homePattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('home');
    }

    // This is not currently used, as setRequestContext is not called for RSS feeds
    if (rssPattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('rss');
    }

    // Each page can only have at most one of these
    if (req.channelConfig) {
        res.locals.context.push(req.channelConfig.name);
    } else if (privatePattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('private');
    } else if (subscribePattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('subscribe');
    } else if (data && data.post && data.post.page) {
        res.locals.context.push('page');
    } else if (data && data.post) {
        res.locals.context.push('post');
    }
}

module.exports = setResponseContext;
