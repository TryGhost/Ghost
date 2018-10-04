const common = require('../../../lib/common'),
    urlService = require('../../url');

module.exports = function handlePageParam(req, res, next, page) {
    // routeKeywords.page: 'page'
    const pageRegex = new RegExp('/page/(.*)?/'),
        rssRegex = new RegExp('/rss/(.*)?/');

    page = parseInt(page, 10);

    if (page === 1) {
        // CASE: page 1 is an alias for the collection index, do a permanent 301 redirect
        // @TODO: this belongs into the rss router!
        if (rssRegex.test(req.url)) {
            return urlService.utils.redirect301(res, req.originalUrl.replace(rssRegex, '/rss/'));
        } else {
            return urlService.utils.redirect301(res, req.originalUrl.replace(pageRegex, '/'));
        }
    } else if (page < 1 || isNaN(page)) {
        return next(new common.errors.NotFoundError({
            message: common.i18n.t('errors.errors.pageNotFound')
        }));
    } else {
        req.params.page = page;
        return next();
    }
};
