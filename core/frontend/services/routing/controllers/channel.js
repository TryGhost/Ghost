const _ = require('lodash');
const debug = require('ghost-ignition').debug('services:routing:controllers:channel');
const {i18n} = require('../../../../server/lib/common');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const themes = require('../../themes');
const helpers = require('../helpers');

/**
 * @description Channel controller.
 *
 * @TODO: The collection+rss controller do almost the same. Merge!
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = function channelController(req, res, next) {
    debug('channelController', req.params, res.routerOptions);

    const pathOptions = {
        page: req.params.page !== undefined ? req.params.page : 1,
        slug: req.params.slug ? security.string.safe(req.params.slug) : undefined
    };

    if (pathOptions.page) {
        // CASE 1: routes.yaml `limit` is stronger than theme definition
        // CASE 2: use `posts_per_page` config from theme as `limit` value
        if (res.routerOptions.limit) {
            themes.getActive().updateTemplateOptions({
                data: {
                    config: {
                        posts_per_page: res.routerOptions.limit
                    }
                }
            });

            pathOptions.limit = res.routerOptions.limit;
        } else {
            const postsPerPage = parseInt(themes.getActive().config('posts_per_page'));

            if (!isNaN(postsPerPage) && postsPerPage > 0) {
                pathOptions.limit = postsPerPage;
            }
        }
    }

    return helpers.fetchData(pathOptions, res.routerOptions, res.locals)
        .then(function handleResult(result) {
            // CASE: requested page is greater than number of pages we have
            if (pathOptions.page > result.meta.pagination.pages) {
                return next(new errors.NotFoundError({
                    message: i18n.t('errors.errors.pageNotFound')
                }));
            }

            // Format data 1
            // @TODO: See helpers/secure for explanation.
            helpers.secure(req, result.posts);

            // @TODO: See helpers/secure for explanation.
            _.each(result.data, function (data) {
                helpers.secure(req, data);
            });

            const renderer = helpers.renderEntries(req, res);
            return renderer(result);
        })
        .catch(helpers.handleError(next));
};
