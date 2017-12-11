var api = require('../api'),
    urlService = require('../services/url'),
    filters = require('../filters'),
    handleError = require('./frontend/error'),
    renderEntry = require('./frontend/render-entry'),
    setRequestIsSecure = require('./frontend/secure');

// This here is a controller.
// The "route" is handled in site/routes.js
module.exports = function previewController(req, res, next) {
    var params = {
        uuid: req.params.uuid,
        status: 'all',
        include: 'author,tags'
    };

    // Note: this is super similar to the config middleware used in channels
    // @TODO refactor into to something explicit
    res._route = {
        type: 'entry'
    };

    api.posts.read(params).then(function then(result) {
        // Format data 1
        var post = result.posts[0];

        if (!post) {
            return next();
        }

        if (req.params.options && req.params.options.toLowerCase() === 'edit') {
            // CASE: last param is of url is /edit, redirect to admin
            return urlService.utils.redirectToAdmin(302, res, '#/editor/' + post.id);
        } else if (req.params.options) {
            // CASE: unknown options param detected. Ignore and end in 404.
            return next();
        }

        if (post.status === 'published') {
            return urlService.utils.redirect301(res, urlService.utils.urlFor('post', {post: post}));
        }

        setRequestIsSecure(req, post);

        filters.doFilter('prePostsRender', post, res.locals)
            .then(renderEntry(req, res));
    }).catch(handleError(next));
};
