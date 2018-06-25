const debug = require('ghost-ignition').debug('services:routing:controllers:entry'),
    url = require('url'),
    urlService = require('../../url'),
    filters = require('../../../filters'),
    helpers = require('../helpers');

/**
 * @TODO:
 *   - use `filter` for `findOne`?
 *   - always execute `next` until no router want's to serve and 404's
 */
module.exports = function entryController(req, res, next) {
    debug('entryController', res.routerOptions);

    return helpers.postLookup(req.path, res.routerOptions)
        .then(function then(lookup) {
            // Format data 1
            const post = lookup ? lookup.post : false;

            if (!post) {
                debug('no post');
                return next();
            }

            // CASE: postlookup can detect options for example /edit, unknown options get ignored and end in 404
            if (lookup.isUnknownOption) {
                debug('isUnknownOption');
                return next();
            }

            // CASE: last param is of url is /edit, redirect to admin
            if (lookup.isEditURL) {
                debug('redirect. is edit url');
                return urlService.utils.redirectToAdmin(302, res, '/editor/' + post.id);
            }

            /**
             * CASE: check if type of router owns this resource
             *
             * Static pages have a hardcoded permalink, which is `/:slug/`.
             * Imagine you define a collection under `/` with the permalink `/:slug/`.
             *
             * The router hierarchy is:
             *
             * 1. collections
             * 2. static pages
             *
             * Both permalinks are registered in express. If you serve a static page, the
             * collection router will try to serve this as a post resource.
             *
             * That's why we have to check against the router type.
             */
            if (urlService.getResourceById(post.id).config.type !== res.routerOptions.resourceType) {
                debug('not my resource type');
                return next();
            }

            /**
             * CASE: Permalink is not valid anymore, we redirect him permanently to the correct one
             *       This should only happen if you have date permalinks enabled and you change
             *       your publish date.
             *
             * @NOTE:
             *
             * Ensure we redirect to the correct post url including subdirectory.
             */
            if (post.url !== req.path) {
                debug('redirect');

                return urlService.utils.redirect301(res, url.format({
                    pathname: urlService.utils.createUrl(post.url, false, false, true),
                    search: url.parse(req.originalUrl).search
                }));
            }

            helpers.secure(req, post);

            filters.doFilter('prePostsRender', post, res.locals)
                .then(helpers.renderEntry(req, res));
        })
        .catch(helpers.handleError(next));
};
