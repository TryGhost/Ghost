/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var moment      = require('moment'),
    RSS         = require('rss'),
    _           = require('lodash'),
    url         = require('url'),
    when        = require('when'),

    api         = require('../api'),
    config      = require('../config'),
    filters     = require('../../server/filters'),
    template    = require('../helpers/template'),
    errors      = require('../errors'),

    frontendControllers,
    staticPostPermalink,
    oldRoute,
    dummyRouter = require('express').Router();

// Overload this dummyRouter as we only want the layer object.
// We don't want to keep in memory many items in an array so we
// clear the stack array after every invocation.
oldRoute = dummyRouter.route;
dummyRouter.route = function () {
    var layer;

    // Apply old route method
    oldRoute.apply(dummyRouter, arguments);

    // Grab layer object
    layer = dummyRouter.stack[0];

    // Reset stack array for memory purposes
    dummyRouter.stack = [];

    // Return layer
    return layer;
};

// Cache static post permalink regex
staticPostPermalink = dummyRouter.route('/:slug/:edit?');

function getPostPage(options) {
    return api.settings.read('postsPerPage').then(function (response) {
        var postPP = response.settings[0],
            postsPerPage = parseInt(postPP.value, 10);

        // No negative posts per page, must be number
        if (!isNaN(postsPerPage) && postsPerPage > 0) {
            options.limit = postsPerPage;
        }
        options.include = 'author,tags,fields';
        return api.posts.browse(options);
    });
}

function formatPageResponse(posts, page) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    posts = _.each(posts, function (post) {
        if (post.author) {
            delete post.author.email;
        }
        return post;
    });
    return {
        posts: posts,
        pagination: page.meta.pagination
    };
}

function formatResponse(post) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    if (post.author) {
        delete post.author.email;
    }
    return {post: post};
}

function handleError(next) {
    return function (err) {
        var e = new Error(err.message);
        e.status = err.code;
        return next(e);
    };
}

// Add Request context parameter to the data object
// to be passed down to the templates
function setReqCtx(req, data) {
    (Array.isArray(data) ? data : [data]).forEach(function (d) {
        d.secure = req.secure;
    });
}

/**
 * Returns the paths object of the active theme via way of a promise.
 * @return {Promise} The promise resolves with the value of the paths.
 */
function getActiveThemePaths() {
    return api.settings.read({
        key: 'activeTheme',
        context: {
            internal: true
        }
    }).then(function (response) {
        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value];

        return paths;
    });
}

frontendControllers = {
    'homepage': function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam
            };

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (pageParam === 1 && req.route.path === '/page/:page/')) {
            return res.redirect(config.paths.subdir + '/');
        }

        return getPostPage(options).then(function (page) {

            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.meta.pagination.pages) {
                return res.redirect(page.meta.pagination.pages === 1 ? config.paths.subdir + '/' : (config.paths.subdir + '/page/' + page.meta.pagination.pages + '/'));
            }

            setReqCtx(req, page.posts);

            // Render the page of posts
            filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                getActiveThemePaths().then(function (paths) {
                    var view = paths.hasOwnProperty('home.hbs') ? 'home' : 'index';

                    // If we're on a page then we always render the index
                    // template.
                    if (pageParam > 1) {
                        view = 'index';
                    }

                    res.render(view, formatPageResponse(posts, page));
                });
            });
        }).otherwise(handleError(next));
    },
    'tag': function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam,
                tag: req.params.slug
            };

        // Get url for tag page
        function tagUrl(tag, page) {
            var url = config.paths.subdir + '/tag/' + tag + '/';

            if (page && page > 1) {
                url += 'page/' + page + '/';
            }

            return url;
        }

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (req.params.page !== undefined && pageParam === 1)) {
            return res.redirect(tagUrl(options.tag));
        }

        return getPostPage(options).then(function (page) {
            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.meta.pagination.pages) {
                return res.redirect(tagUrl(options.tag, page.meta.pagination.pages));
            }

            setReqCtx(req, page.posts);
            if (page.meta.filters.tags) {
                setReqCtx(req, page.meta.filters.tags[0]);
            }

            // Render the page of posts
            filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                getActiveThemePaths().then(function (paths) {
                    var view = paths.hasOwnProperty('tag.hbs') ? 'tag' : 'index',

                        // Format data for template
                        result = _.extend(formatPageResponse(posts, page), {
                            tag: page.meta.filters.tags ? page.meta.filters.tags[0] : ''
                        });

                    // If the resulting tag is '' then 404.
                    if (!result.tag) {
                        return next();
                    }
                    res.render(view, result);
                });
            });
        }).otherwise(handleError(next));
    },
    'author': function (req, res, next) {

        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam,
                author: req.params.slug
            };



        // Get url for tag page
        function authorUrl(author, page) {
            var url = config.paths.subdir + '/author/' + author + '/';

            if (page && page > 1) {
                url += 'page/' + page + '/';
            }

            return url;
        }

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (req.params.page !== undefined && pageParam === 1)) {
            return res.redirect(authorUrl(options.author));
        }

        return getPostPage(options).then(function (page) {
            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.meta.pagination.pages) {
                return res.redirect(authorUrl(options.author, page.meta.pagination.pages));
            }

            setReqCtx(req, page.posts);
            if (page.meta.filters.author) {
                setReqCtx(req, page.meta.filters.author);
            }

            // Render the page of posts
            filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                getActiveThemePaths().then(function (paths) {
                    var view = paths.hasOwnProperty('author.hbs') ? 'author' : 'index',

                        // Format data for template
                        result = _.extend(formatPageResponse(posts, page), {
                            author: page.meta.filters.author ? page.meta.filters.author : ''
                        });

                    // If the resulting author is '' then 404.
                    if (!result.author) {
                        return next();
                    }
                    res.render(view, result);
                });
            });
        }).otherwise(handleError(next));
    },

    'single': function (req, res, next) {
        var path = req.path,
            params,
            editFormat,
            usingStaticPermalink = false;

        api.settings.read('permalinks').then(function (response) {
            var permalink = response.settings[0],
                postLookup;

            editFormat = permalink.value[permalink.value.length - 1] === '/' ? ':edit?' : '/:edit?';

            // Convert saved permalink into an express Route object
            permalink = dummyRouter.route(permalink.value + editFormat);

            // Check if the path matches the permalink structure.
            //
            // If there are no matches found we then
            // need to verify it's not a static post,
            // and test against that permalink structure.
            if (permalink.match(path) === false) {
                // If there are still no matches then return.
                if (staticPostPermalink.match(path) === false) {
                    // Reject promise chain with type 'NotFound'
                    return when.reject(new errors.NotFoundError());
                }

                permalink = staticPostPermalink;
                usingStaticPermalink = true;
            }

            params = permalink.params;

            // Sanitize params we're going to use to lookup the post.
            postLookup = _.pick(permalink.params, 'slug', 'id');
            // Add author, tag and fields
            postLookup.include = 'author,tags,fields';

            // Query database to find post
            return api.posts.read(postLookup);
        }).then(function (result) {
            var post = result.posts[0],
                slugDate = [],
                slugFormat = [];

            if (!post) {
                return next();
            }

            function render() {
                // If we're ready to render the page but the last param is 'edit' then we'll send you to the edit page.
                if (params.edit === 'edit') {
                    return res.redirect(config.paths.subdir + '/ghost/editor/' + post.id + '/');
                } else if (params.edit !== undefined) {
                    // reject with type: 'NotFound'
                    return when.reject(new errors.NotFoundError());
                }

                setReqCtx(req, post);

                filters.doFilter('prePostsRender', post).then(function (post) {
                    getActiveThemePaths().then(function (paths) {
                        var view = template.getThemeViewForPost(paths, post);

                        res.render(view, formatResponse(post));
                    });
                });
            }

            // If we've checked the path with the static permalink structure
            // then the post must be a static post.
            // If it is not then we must return.
            if (usingStaticPermalink) {
                if (post.page) {
                    return render();
                }

                return next();
            }

            // If there is any date based paramter in the slug
            // we will check it against the post published date
            // to verify it's correct.
            if (params.year || params.month || params.day) {
                if (params.year) {
                    slugDate.push(params.year);
                    slugFormat.push('YYYY');
                }

                if (params.month) {
                    slugDate.push(params.month);
                    slugFormat.push('MM');
                }

                if (params.day) {
                    slugDate.push(params.day);
                    slugFormat.push('DD');
                }

                slugDate = slugDate.join('/');
                slugFormat = slugFormat.join('/');

                if (slugDate === moment(post.published_at).format(slugFormat)) {
                    return render();
                }

                return next();
            }

            return render();

        }).otherwise(function (err) {
            // If we've thrown an error message
            // of type: 'NotFound' then we found
            // no path match.
            if (err.type === 'NotFoundError') {
                return next();
            }

            return handleError(next)(err);
        });
    },
    'rss': function (req, res, next) {
        function isPaginated() {
            return req.route.path.indexOf(':page') !== -1;
        }

        function isTag() {
            return req.route.path.indexOf('/tag/') !== -1;
        }

        function isAuthor() {
            return req.route.path.indexOf('/author/') !== -1;
        }

        // Initialize RSS
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            slugParam = req.params.slug,
            baseUrl = config.paths.subdir;

        if (isTag()) {
            baseUrl += '/tag/' + slugParam + '/rss/';
        } else if (isAuthor()) {
            baseUrl += '/author/' + slugParam + '/rss/';
        } else {
            baseUrl += '/rss/';
        }

        // No negative pages, or page 1
        if (isNaN(pageParam) || pageParam < 1 || (pageParam === 1 && isPaginated())) {
            return res.redirect(baseUrl);
        }

        return when.settle([
            api.settings.read('title'),
            api.settings.read('description'),
            api.settings.read('permalinks')
        ]).then(function (result) {

            var options = {};
            if (pageParam) { options.page = pageParam; }
            if (isTag()) { options.tag = slugParam; }
            if (isAuthor()) { options.author = slugParam; }

            options.include = 'author,tags,fields';

            return api.posts.browse(options).then(function (page) {

                var title = result[0].value.settings[0].value,
                    description = result[1].value.settings[0].value,
                    permalinks = result[2].value.settings[0],
                    majorMinor = /^(\d+\.)?(\d+)/,
                    trimmedVersion = res.locals.version,
                    siteUrl = config.urlFor('home', {secure: req.secure}, true),
                    feedUrl = config.urlFor('rss', {secure: req.secure}, true),
                    maxPage = page.meta.pagination.pages,
                    feedItems = [],
                    feed;

                trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';

                if (isTag()) {
                    if (page.meta.filters.tags) {
                        title = page.meta.filters.tags[0].name + ' - ' + title;
                        feedUrl = siteUrl + 'tag/' + page.meta.filters.tags[0].slug + '/rss/';
                    }
                }

                if (isAuthor()) {
                    if (page.meta.filters.author) {
                        title = page.meta.filters.author.name + ' - ' + title;
                        feedUrl = siteUrl + 'author/' + page.meta.filters.author.slug + '/rss/';
                    }
                }

                feed = new RSS({
                    title: title,
                    description: description,
                    generator: 'Ghost ' + trimmedVersion,
                    feed_url: feedUrl,
                    site_url: siteUrl,
                    ttl: '60'
                });

                // If page is greater than number of pages we have, redirect to last page
                if (pageParam > maxPage) {
                    return res.redirect(baseUrl + maxPage + '/');
                }

                setReqCtx(req, page.posts);

                filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                    posts.forEach(function (post) {
                        var deferred = when.defer(),
                            item = {
                                title: post.title,
                                guid: post.uuid,
                                url: config.urlFor('post', {post: post, permalinks: permalinks}, true),
                                date: post.published_at,
                                categories: _.pluck(post.tags, 'name'),
                                author: post.author ? post.author.name : null
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
                        feedItems.push(deferred.promise);
                        deferred.resolve();
                    });
                });

                when.all(feedItems).then(function () {
                    res.set('Content-Type', 'text/xml; charset=UTF-8');
                    res.send(feed.xml());
                });
            });
        }).otherwise(handleError(next));
    }
};

module.exports = frontendControllers;
