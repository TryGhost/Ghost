/**
 * Main controller for Ghost frontend
 */

/*global require, module */
(function () {
    'use strict';

    var Ghost = require('../../ghost'),
        _ = require('underscore'),

        ghost = new Ghost(),
        frontendControllers;

    frontendControllers = {
        'homepage': function (req, res) {
            var featureCount = 0,
                postCount = 0,
                data;

            ghost.dataProvider().posts.findAll(function (error, posts) {
                data = _.groupBy(posts, function (post) {
                    var group = null;
                    if (post.featured === true && featureCount < ghost.config().homepage.features) {
                        featureCount += 1;
                        group = 'features';
                    } else if (postCount < ghost.config().homepage.posts) {
                        postCount += 1;
                        group = 'posts';
                    }

                    return group;
                });

                ghost.doFilter('prepostsRender', data.posts, function (posts) {
                    res.render('index', {features: data.features, posts: posts, ghostGlobals: ghost.globals()});
                });
            });
        },
        'single': function (req, res) {
            ghost.dataProvider().posts.findOne({'slug': req.params.slug}, function (error, post) {
                ghost.doFilter('prePostsRender', post, function (post) {
                    res.render('single', {post: post, ghostGlobals: ghost.globals()});
                });
            });
        }
    };


    module.exports = frontendControllers;
}());