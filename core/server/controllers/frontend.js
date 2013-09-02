/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var Ghost = require('../../ghost'),
    api = require('../api'),
    RSS = require('rss'),

    ghost = new Ghost(),
    frontendControllers;

frontendControllers = {
    'homepage': function (req, res) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1;

        // No negative pages
        if (pageParam < 1) {
            return res.redirect("/page/1/");
        }

        api.posts.browse({page: pageParam}).then(function (page) {
            var maxPage = page.pages;

            // A bit of a hack for situations with no content.
            if (maxPage === 0) {
                maxPage = 1;
                page.pages = 1;
            }

            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > maxPage) {
                return res.redirect("/page/" + maxPage + "/");
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
    },
    'rss': function (req, res) {
        // Initialize RSS
        var siteUrl = ghost.config().siteUrl,
            feed = new RSS({
                title: ghost.settings().title,
                description: ghost.settings().description,
                generator: 'Ghost v' + ghost.settings().currentVersion,
                author: ghost.settings().author,
                feed_url: siteUrl + '/rss/',
                site_url: siteUrl,
                ttl: '60'
            }),
            // Parse the page number
            pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1;

        // No negative pages
        if (pageParam < 1) {
            return res.redirect("/rss/1/");
        }

        api.posts.browse({page: pageParam}).then(function (page) {
            var maxPage = page.pages;

            // A bit of a hack for situations with no content.
            if (maxPage === 0) {
                maxPage = 1;
                page.pages = 1;
            }

            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > maxPage) {
                return res.redirect("/rss/" + maxPage + "/");
            }

            ghost.doFilter('prePostsRender', page.posts, function (posts) {
                posts.forEach(function (post) {
                    var item = {
                        title:  post.title,
                        guid: post.uuid,
                        url: siteUrl + '/' + post.slug + '/',
                        date: post.published_at
                    };

                    if (post.meta_description !== null) {
                        item.push({ description: post.meta_description });
                    }

                    feed.item(item);
                });
                res.set('Content-Type', 'text/xml');
                res.send(feed.xml());
            });
        });
    }
};

module.exports = frontendControllers;