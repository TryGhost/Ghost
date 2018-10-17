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

    /**
     * @TODO:
     *
     * We actually need to differentiate here between pages and posts controller for v2.
     * Currently this API call is without context object and it works out of the box, because the v2 serializer
     * only forces `page:true|false` if you send a content key.
     *
     * It's also a little tricky, because the v0.1 has no pages controller.
     * Furthermore, the preview router is used for pages and posts and we just receive a uuid. How to know
     * which controller to call? pages or posts?
     */
    api.posts.read(params)
        .then(function then(result) {
            const post = result.posts[0];

            if (!post) {
                return next();
            }

            if (req.params.options && req.params.options.toLowerCase() === 'edit') {
                // CASE: last param of the url is /edit, redirect to admin
                return urlService.utils.redirectToAdmin(302, res, '/editor/' + post.id);
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
