const _ = require('lodash');
const debug = require('@tryghost/debug')('services:routing:controllers:collection');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const {routerManager} = require('../');
const themeEngine = require('../../theme-engine');
const renderer = require('../../rendering');
const dataService = require('../../data');

const messages = {
    pageNotFound: 'Page not found.'
};

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
            themeEngine.getActive().updateTemplateOptions({
                data: {
                    config: {
                        posts_per_page: res.routerOptions.limit
                    }
                }
            });

            pathOptions.limit = res.routerOptions.limit;
        } else {
            const postsPerPage = parseInt(themeEngine.getActive().config('posts_per_page'));

            if (!isNaN(postsPerPage) && postsPerPage > 0) {
                pathOptions.limit = postsPerPage;
            }
        }
    }

    debug('fetching data');
    return dataService.fetchData(pathOptions, res.routerOptions, res.locals)
        .then(function handleResult(result) {
            // CASE: requested page is greater than number of pages we have
            if (pathOptions.page > result.meta.pagination.pages) {
                return next(new errors.NotFoundError({
                    message: tpl(messages.pageNotFound)
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
                if (routerManager.owns(res.routerOptions.identifier, post.id)) {
                    return post;
                }

                debug(`'${post.slug}' is not owned by this collection`);
            });

            return renderer.renderEntries(req, res)(result);
        })
        .catch(renderer.handleError(next));
};
