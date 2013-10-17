/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var Ghost  = require('../../ghost'),
    api    = require('../api'),
    RSS    = require('rss'),
    _      = require('underscore'),
    errors = require('../errorHandling'),
    when   = require('when'),
    url    = require('url'),


    ghost  = new Ghost(),
    frontendControllers;

frontendControllers = {
    'homepage': function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            postsPerPage = parseInt(ghost.settings('postsPerPage'), 10),
            options = {};

        // No negative pages
        if (isNaN(pageParam) || pageParam < 1) {
            //redirect to 404 page?
            return res.redirect('/');
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
        }).otherwise(function (err) {
            return next(new Error(err));
        });
    },
    'single': function (req, res, next) {
        api.posts.read({'slug': req.params.slug}).then(function (post) {
            if (post) {
                ghost.doFilter('prePostsRender', post, function (post) {
                    res.render('post', {post: post});
                });
            } else {
                next();
            }

        }).otherwise(function (err) {
            return next(new Error(err));
        });
    },
    'rss': function (req, res, next) {
        // Initialize RSS
        var siteUrl = ghost.config().url,
            pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            feed;
        //needs refact for multi user to not use first user as default
        api.users.read({id : 1}).then(function (user) {
            feed = new RSS({
                title: ghost.settings('title'),
                description: ghost.settings('description'),
                generator: 'Ghost v' + res.locals.version,
                author: user ? user.name : null,
                feed_url: url.resolve(siteUrl, '/rss/'),
                site_url: siteUrl,
                ttl: '60'
            });

            // No negative pages
            if (isNaN(pageParam) || pageParam < 1) {
                return res.redirect('/rss/');
            }

            if (pageParam === 1 && req.route.path === '/rss/:page/') {
                return res.redirect('/rss/');
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
                    return res.redirect('/rss/' + maxPage + '/');
                }

                ghost.doFilter('prePostsRender', page.posts, function (posts) {
                    posts.forEach(function (post) {
                        var item = {
                                title:  _.escape(post.title),
                                guid: post.uuid,
                                url: siteUrl + '/' + post.slug + '/',
                                date: post.published_at,
                            },
                            content = post.html;

                        //set img src to absolute url
                        content = content.replace(/src=["|'|\s]?([\w\/\?\$\.\+\-;%:@&=,_]+)["|'|\s]?/gi, function (match, p1) {
                            p1 = url.resolve(siteUrl, p1);
                            return "src='" + p1 + "' ";
                        });
                        //set a href to absolute url
                        content = content.replace(/href=["|'|\s]?([\w\/\?\$\.\+\-;%:@&=,_]+)["|'|\s]?/gi, function (match, p1) {
                            p1 = url.resolve(siteUrl, p1);
                            return "href='" + p1 + "' ";
                        });
                        item.description = content;
                        feed.item(item);
                    });
                    res.set('Content-Type', 'text/xml');
                    res.send(feed.xml());
                });
            });
        }).otherwise(function (err) {
            return next(new Error(err));
        });
    }

};

module.exports = frontendControllers;