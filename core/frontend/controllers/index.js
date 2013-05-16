/**
 * Main controller for Ghost frontend
 */

/*global require, module */
(function () {
    'use strict';

    var Ghost = require('../../ghost'),
        api = require('../../shared/api'),

        ghost = new Ghost(),
        frontendControllers;

    frontendControllers = {
        'homepage': function (req, res) {
            api.posts.browse().then(function (posts) {
                ghost.doFilter('prePostsRender', posts.toJSON(), function (posts) {
                    res.render('index', {posts: posts, ghostGlobals: ghost.globals()});
                });
            });
        },
        'single': function (req, res) {
            api.posts.read({'slug': req.params.slug}).then(function (post) {
                ghost.doFilter('prePostsRender', post.toJSON(), function (post) {
                    res.render('single', {post: post, ghostGlobals: ghost.globals()});
                });
            });
        }
    };

    module.exports = frontendControllers;
}());