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
                // TODO: Make this more promisey or something
                ghost.doFilter('ghostNavItems', {path: req.path, navItems: []}, function(navData) {
                    ghost.doFilter('prePostsRender', posts.toJSON(), function (posts) {
                        res.render('index', {posts: posts, ghostGlobals: ghost.globals(), navItems: navData.navItems});
                    });
                });
            });
        },
        'single': function (req, res) {
            api.posts.read({'slug': req.params.slug}).then(function (post) {
                ghost.doFilter('ghostNavItems', {path: req.path, navItems: []}, function(navData) {
                    ghost.doFilter('prePostsRender', post.toJSON(), function (post) {
                        res.render('single', {post: post, ghostGlobals: ghost.globals(), navItems: navData.navItems});
                    });
                });
            });
        }
    };

    module.exports = frontendControllers;
}());