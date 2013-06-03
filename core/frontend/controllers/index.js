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
            api.posts.browse().then(function (page) {
                ghost.doFilter('prePostsRender', page.posts, function (posts) {
                    res.render('index', {posts: posts, ghostGlobals: res.locals.ghostGlobals, navItems: res.locals.navItems});
                });
            });
        },
        'single': function (req, res) {
            api.posts.read({'slug': req.params.slug}).then(function (post) {
                ghost.doFilter('prePostsRender', post.toJSON(), function (post) {
                    res.render('single', {post: post, ghostGlobals: res.locals.ghostGlobals, navItems: res.locals.navItems});
                });
            });
        }
    };

    module.exports = frontendControllers;
}());