var api = require('../api'),
    utils = require('../utils'),
    filters = require('../filters'),
    handleError = require('./frontend/error'),
    renderPost = require('./frontend/render-post'),
    setRequestIsSecure = require('./frontend/secure');

module.exports = function preview(req, res, next) {
    var params = {
        uuid: req.params.uuid,
        status: 'all',
        include: 'author,tags'
    };

    api.posts.read(params).then(function then(result) {
        var post = result.posts[0];

        if (!post) {
            return next();
        }

        if (req.params.options && req.params.options.toLowerCase() === 'edit') {
            // CASE: last param is of url is /edit, redirect to admin
            return utils.url.redirectToAdmin(302, res, '#/editor/' + post.id);
        } else if (req.params.options) {
            // CASE: unknown options param detected. Ignore and end in 404.
            return next();
        }

        if (post.status === 'published') {
            return utils.url.redirect301(res, utils.url.urlFor('post', {post: post}));
        }

        setRequestIsSecure(req, post);

        filters.doFilter('prePostsRender', post, res.locals)
            .then(renderPost(req, res));
    }).catch(handleError(next));
};
