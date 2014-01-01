/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var config  = require('../config'),
    api     = require('../api'),
    RSS     = require('rss'),
    _       = require('underscore'),
    errors  = require('../errorHandling'),
    when    = require('when'),
    url     = require('url'),
    filters = require('../../server/filters'),
    coreHelpers = require('../helpers'),

    frontendControllers;

frontendControllers = {
    'homepage': function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            postsPerPage,
            options = {};

        api.settings.read('postsPerPage').then(function (postPP) {
            postsPerPage = parseInt(postPP.value, 10);
            // No negative pages
            if (isNaN(pageParam) || pageParam < 1) {
                //redirect to 404 page?
                return res.redirect('/');
            }
            options.page = pageParam;

            // Redirect '/page/1/' to '/' for all teh good SEO
            if (pageParam === 1 && req.route.path === '/page/:page/') {
                return res.redirect(config.paths().subdir + '/');
            }

            // No negative posts per page, must be number
            if (!isNaN(postsPerPage) && postsPerPage > 0) {
                options.limit = postsPerPage;
            }
            return;
        }).then(function () {
            return api.posts.browse(options);
        }).then(function (page) {
            var maxPage = page.pages;

            // A bit of a hack for situations with no content.
            if (maxPage === 0) {
                maxPage = 1;
                page.pages = 1;
            }

            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > maxPage) {
                return res.redirect(maxPage === 1 ? config.paths().subdir + '/' : (config.paths().subdir + '/page/' + maxPage + '/'));
            }

            // Render the page of posts
            filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                res.render('index', {posts: posts, pagination: {page: page.page, prev: page.prev, next: page.next, limit: page.limit, total: page.total, pages: page.pages}});
            });
        }).otherwise(function (err) {
            var e = new Error(err.message);
            e.status = err.errorCode;
            return next(e);
        });
    },
    'single': function (req, res, next) {
        // From route check if a date was parsed
        // from the regex
        var dateInSlug = req.params[0] ? true : false;
        console.log('SINGLE', req.params, dateInSlug);
        when.join(
            api.settings.read('permalinks'),
            api.posts.read({slug: req.params[1]})
        ).then(function (promises) {
            var permalink = promises[0].value,
                post = promises[1];

            function render() {
                filters.doFilter('prePostsRender', post).then(function (post) {
                    api.settings.read('activeTheme').then(function (activeTheme) {
                        var paths = config.paths().availableThemes[activeTheme.value],
                            view = post.page && paths.hasOwnProperty('page') ? 'page' : 'post';
                        res.render(view, {post: post});
                    });
                });
            }

            if (!post) {
                return next();
            }

            // A page can only be rendered when there is no date in the url.
            // A post can either be rendered with a date in the url
            // depending on the permalink setting.
            // For all other conditions return 404.
            if (post.page === 1 && dateInSlug === false) {
                return render();
            }

            if (post.page === 0) {
                // Handle post rendering
                if ((permalink === '/:slug/' && dateInSlug === false) ||
                        (permalink !== '/:slug/' && dateInSlug === true)) {
                    return render();
                }
            }

            next();


        }).otherwise(function (err) {
            var e = new Error(err.message);
            e.status = err.errorCode;
            return next(e);
        });
    },
    'rss': function (req, res, next) {
        // Initialize RSS
        var siteUrl = config().url,
            pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            feed;
        //needs refact for multi user to not use first user as default
        when.settle([
            api.users.read({id : 1}),
            api.settings.read('title'),
            api.settings.read('description')
        ]).then(function (result) {
            var user = result[0].value,
                title = result[1].value.value,
                description = result[2].value.value;

            feed = new RSS({
                title: title,
                description: description,
                generator: 'Ghost v' + res.locals.version,
                author: user ? user.name : null,
                feed_url: url.resolve(siteUrl, '/rss/'),
                site_url: siteUrl,
                ttl: '60'
            });

            // No negative pages
            if (isNaN(pageParam) || pageParam < 1) {
                return res.redirect(config.paths().subdir + '/rss/');
            }

            if (pageParam === 1 && req.route.path === config.paths().subdir + '/rss/:page/') {
                return res.redirect(config.paths().subdir + '/rss/');
            }

            api.posts.browse({page: pageParam}).then(function (page) {
                var maxPage = page.pages,
                    feedItems = [];

                // A bit of a hack for situations with no content.
                if (maxPage === 0) {
                    maxPage = 1;
                    page.pages = 1;
                }

                // If page is greater than number of pages we have, redirect to last page
                if (pageParam > maxPage) {
                    return res.redirect(config.paths().subdir + '/rss/' + maxPage + '/');
                }

                filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                    posts.forEach(function (post) {
                        var deferred = when.defer();
                        post.url = coreHelpers.url;
                        post.url().then(function (postUrl) {
                            var item = {
                                    title:  _.escape(post.title),
                                    guid: post.uuid,
                                    url: siteUrl + postUrl,
                                    date: post.published_at,
                                    categories: _.pluck(post.tags, 'name')
                                },
                                content = post.html;

                            //set img src to absolute url
                            content = content.replace(/src=["|'|\s]?([\w\/\?\$\.\+\-;%:@&=,_]+)["|'|\s]?/gi, function (match, p1) {
                                /*jslint unparam:true*/
                                p1 = url.resolve(siteUrl, p1);
                                return "src='" + p1 + "' ";
                            });
                            //set a href to absolute url
                            content = content.replace(/href=["|'|\s]?([\w\/\?\$\.\+\-;%:@&=,_]+)["|'|\s]?/gi, function (match, p1) {
                                /*jslint unparam:true*/
                                p1 = url.resolve(siteUrl, p1);
                                return "href='" + p1 + "' ";
                            });
                            item.description = content;
                            feed.item(item);
                            deferred.resolve();
                        });
                        feedItems.push(deferred.promise);
                    });
                });
                when.all(feedItems).then(function () {
                    res.set('Content-Type', 'text/xml');
                    res.send(feed.xml());
                });
            });
        }).otherwise(function (err) {
            var e = new Error(err.message);
            e.status = err.errorCode;
            return next(e);
        });
    }
};

module.exports = frontendControllers;
