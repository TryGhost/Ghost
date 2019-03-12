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
const labs = require('../../labs'),
    // @TODO: fix this, this is app specific and should be dynamic
    // routeKeywords.private: 'private'
    privatePattern = new RegExp('^\\/private\\/'),
    // routeKeywords.subscribe: 'subscribe'
    subscribePattern = new RegExp('^\\/subscribe\\/'),
    // routeKeywords.amp: 'amp'
    ampPattern = new RegExp('\\/amp\\/$'),
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

    // Add context 'amp' to either post or page, if we have an `*/amp` route
    if (ampPattern.test(res.locals.relativeUrl) && data.post) {
        res.locals.context.push('amp');
    }

    // Each page can only have at most one of these
    if (res.routerOptions && res.routerOptions.context) {
        res.locals.context = res.locals.context.concat(res.routerOptions.context);
    }

    if (privatePattern.test(res.locals.relativeUrl)) {
        if (!res.locals.context.includes('private')) {
            res.locals.context.push('private');
        }
    }

    if (subscribePattern.test(res.locals.relativeUrl) && labs.isSet('subscribers') === true) {
        if (!res.locals.context.includes('subscribe')) {
            res.locals.context.push('subscribe');
        }
    }

    if (data && data.post && data.post.page) {
        if (!res.locals.context.includes('page')) {
            res.locals.context.push('page');
        }
    } else if (data && data.post) {
        if (!res.locals.context.includes('post')) {
            res.locals.context.push('post');
        }
    } else if (data && data.page) {
        if (!res.locals.context.includes('page')) {
            res.locals.context.push('page');
        }
    }
}

module.exports = setResponseContext;
