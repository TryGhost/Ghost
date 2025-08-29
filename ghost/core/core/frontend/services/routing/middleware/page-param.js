const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../../shared/url-utils');
const config = require('../../../../shared/config');

const messages = {
    pageNotFound: 'Page not found.'
};

/**
 * @description Middleware, which validates and interprets the page param e.g. /page/1
 * The name of the page parameter may have been modified in the config to something other than 'page'.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @param {Number} page
 * @returns {*}
 */
module.exports = function handlePageParam(req, res, next, page) {
    const pageParam = config.get('pagination:pageParameter');
    // routeKeywords.page: 'page'
    const pageRegex = new RegExp('/' + pageParam + '/(.*)?/');

    page = parseInt(page, 10);

    if (page === 1) {
        // CASE: page 1 is an alias for the collection index, do a permanent 301 redirect
        return urlUtils.redirect301(res, req.originalUrl.replace(pageRegex, '/'));
    } else if (page < 1 || isNaN(page)) {
        return next(new errors.NotFoundError({
            message: tpl(messages.pageNotFound)
        }));
    } else {
        req.params[pageParam] = page;
        return next();
    }
};
