const debug = require('ghost-ignition').debug('services:routing:controllers:preview'),
    urlService = require('../../url'),
    filters = require('../../../filters'),
    helpers = require('../helpers');

module.exports = function previewController(req, res, next) {
    debug('previewController');

    const api = require('../../../api')[res.locals.apiVersion];

    const params = {
        uuid: req.params.uuid,
        status: 'all',
        include: 'author,authors,tags'
    };

    api[res.routerOptions.query.controller]
        .read(params)
        .then(function then(result) {
            const post = result[res.routerOptions.query.resource][0];

            if (!post) {
                return next();
            }

            if (req.params.options && req.params.options.toLowerCase() === 'edit') {
                // @TODO: we don't know which resource type it is, because it's a generic preview handler
                // @TODO: figure out how to solve better
                const resourceType = post.page ? 'page' : 'post';

                // CASE: last param of the url is /edit, redirect to admin
                return urlService.utils.redirectToAdmin(302, res, `/editor/${resourceType}/${post.id}`);
            } else if (req.params.options) {
                // CASE: unknown options param detected, ignore
                return next();
            }

            if (post.status === 'published') {
                return urlService.utils.redirect301(res, urlService.getUrlByResourceId(post.id, {withSubdirectory: true}));
            }

            helpers.secure(req, post);

            filters.doFilter('prePostsRender', post, res.locals)
                .then(helpers.renderEntry(req, res));
        })
        .catch(helpers.handleError(next));
};
