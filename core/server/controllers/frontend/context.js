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
    tagPattern = new RegExp('^\\/' + config.routeKeywords.tag + '\\/.+'),
    authorPattern = new RegExp('^\\/' + config.routeKeywords.author + '\\/.+'),
    privatePattern = new RegExp('^\\/' + config.routeKeywords.private + '\\/'),
    indexPattern = new RegExp('^\\/' + config.routeKeywords.page + '\\/'),
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

    // paged context
    if (!isNaN(pageParam) && pageParam > 1) {
        res.locals.context.push('paged');
    }

    if (indexPattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('index');
    } else if (homePattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('home');
        res.locals.context.push('index');
    } else if (rssPattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('rss');
    } else if (privatePattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('private');
    } else if (tagPattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('tag');
    } else if (authorPattern.test(res.locals.relativeUrl)) {
        res.locals.context.push('author');
    } else if (data && data.post && data.post.page) {
        res.locals.context.push('page');
    } else {
        res.locals.context.push('post');
    }
}

module.exports = setResponseContext;
