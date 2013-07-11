/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var Ghost = require('../../ghost'),
    api = require('../../shared/api'),

    ghost = new Ghost(),
    frontendControllers;

frontendControllers = {
    'homepage': function (req, res) {
        var page = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1;
        api.posts.browse({page: page}).then(function (page) {
            ghost.doFilter('prePostsRender', page.posts, function (posts) {
                res.render('index', {posts: posts, pagination: {page: page.page, prev: page.prev, next: page.next, limit: page.limit, total: page.total, pages: page.pages}});
            });
        });
    },
    'single': function (req, res) {
        api.posts.read({'slug': req.params.slug}).then(function (post) {
            ghost.doFilter('prePostsRender', post.toJSON(), function (post) {
                res.render('post', {post: post});
            });
        });
    }
};

module.exports = frontendControllers;