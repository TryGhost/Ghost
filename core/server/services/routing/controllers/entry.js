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

    return helpers.entryLookup(req.path, res.routerOptions, res.locals)
        .then(function then(lookup) {
            // Format data 1
            const entry = lookup ? lookup.entry : false;

            if (!entry) {
                debug('no entry');
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
                return urlService.utils.redirectToAdmin(302, res, `/editor/${res.routerOptions.resourceType.replace(/s$/, '')}/${entry.id}`);
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
            if (urlService.getResourceById(entry.id).config.type !== res.routerOptions.resourceType) {
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
             *
             * @NOTE:
             * This file is used for v0.1 and v2. v0.1 returns relative urls, v2 returns absolute urls.
             *
             * @TODO:
             * Simplify if we drop v0.1.
             */
            if (urlService.utils.absoluteToRelative(entry.url, {withoutSubdirectory: true}) !== req.path) {
                debug('redirect');

                return urlService.utils.redirect301(res, url.format({
                    pathname: url.parse(entry.url).pathname,
                    search: url.parse(req.originalUrl).search
                }));
            }

            helpers.secure(req, entry);

            filters.doFilter('prePostsRender', entry, res.locals)
                .then(helpers.renderEntry(req, res));
        })
        .catch(helpers.handleError(next));
};
