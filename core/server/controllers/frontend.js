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
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            postsPerPage = parseInt(ghost.settings().postsPerPage, 10),
            options = {};

        // No negative pages
        if (isNaN(pageParam) || pageParam < 1) {
            //redirect to 404 page?
            return res.redirect("/");
        }
        options.page = pageParam;

        // Redirect '/page/1/' to '/' for all teh good SEO
        if (pageParam === 1 && req.route.path === '/page/:page/') {
            return res.redirect('/');
        }

        // No negative posts per page, must be number
        if (!isNaN(postsPerPage) && postsPerPage > 0) {
            options.limit = postsPerPage;
        }

        api.posts.browse(options).then(function (page) {

            var maxPage = page.pages;

            // A bit of a hack for situations with no content.
            if (maxPage === 0) {
                maxPage = 1;
                page.pages = 1;
            }

            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > maxPage) {
                return res.redirect(maxPage === 1 ? '/' : ('/page/' + maxPage + '/'));
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
        var siteUrl = ghost.config().url,
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