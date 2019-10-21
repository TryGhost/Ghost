const _ = require('lodash'),
    debug = require('ghost-ignition').debug('services:routing:controllers:collection'),
    common = require('../../../../server/lib/common'),
    security = require('../../../../server/lib/security'),
    urlService = require('../../url'),
    themes = require('../../themes'),
    helpers = require('../helpers');

/**
 * @description Collection controller.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {Promise}
 */
module.exports = function collectionController(req, res, next) {
    debug('collectionController beging', req.params, res.routerOptions);

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

    debug('fetching data');
    return helpers.fetchData(pathOptions, res.routerOptions, res.locals)
        .then(function handleResult(result) {
            // CASE: requested page is greater than number of pages we have
            if (pathOptions.page > result.meta.pagination.pages) {
                return next(new common.errors.NotFoundError({
                    message: common.i18n.t('errors.errors.pageNotFound')
                }));
            }

            debug(`posts in collection ${result.posts.length}`);

            /**
             * CASE:
             *
             * Does this post belong to this collection?
             * A post can only live in one collection. If you make use of multiple collections and you mis-use your routes.yaml,
             * it can happen that your database query will load the same posts, but we cannot show a post on two
             * different urls. This helper is only a prevention, but it's not a solution for the user, because
             * it will break pagination (e.g. you load 10 posts from database, but you only render 9).
             *
             * People should always invert their filters to ensure that the database query loads unique posts per collection.
             */
            result.posts = _.filter(result.posts, (post) => {
                if (urlService.owns(res.routerOptions.identifier, post.id)) {
                    return post;
                }

                debug(`'${post.slug}' is not owned by this collection`);
            });

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
