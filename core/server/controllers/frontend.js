/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var Ghost = require('../../ghost'),
    api = require('../api'),

    ghost = new Ghost(),
    frontendControllers;

frontendControllers = {
    'homepage': function (req, res) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1;
        api.posts.browse({page: pageParam}).then(function (page) {
            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.pages) {
                return res.redirect("/page/" + (page.pages) + "/");
            }

            // Render the page of posts
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