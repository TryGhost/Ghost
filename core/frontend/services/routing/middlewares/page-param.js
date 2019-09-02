const common = require('../../../../server/lib/common'),
    urlUtils = require('../../../../server/lib/url-utils');

/**
 * @description Middleware, which validates and interprets the page param e.g. /page/1
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @param {Number} page
 * @returns {*}
 */
module.exports = function handlePageParam(req, res, next, page) {
    // routeKeywords.page: 'page'
    const pageRegex = new RegExp('/page/(.*)?/');

    page = parseInt(page, 10);

    if (page === 1) {
        // CASE: page 1 is an alias for the collection index, do a permanent 301 redirect
        return urlUtils.redirect301(res, req.originalUrl.replace(pageRegex, '/'));
    } else if (page < 1 || isNaN(page)) {
        return next(new common.errors.NotFoundError({
            message: common.i18n.t('errors.errors.pageNotFound')
        }));
    } else {
        req.params.page = page;
        return next();
    }
};
