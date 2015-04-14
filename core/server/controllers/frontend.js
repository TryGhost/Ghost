/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var moment      = require('moment'),
    rss         = require('../data/xml/rss'),
    _           = require('lodash'),
    Promise     = require('bluebird'),
    api         = require('../api'),
    config      = require('../config'),
    filters     = require('../filters'),
    template    = require('../helpers/template'),
    errors      = require('../errors'),
    routeMatch  = require('path-match')(),

    frontendControllers,
    staticPostPermalink;

// Cache static post permalink regex
staticPostPermalink = routeMatch('/:slug/:edit?');

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

/**
 * formats variables for handlebars in multi-post contexts.
 * If extraValues are available, they are merged in the final value
 * @return {Object} containing page variables
 */
function formatPageResponse(posts, page, extraValues) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    posts = _.each(posts, function (post) {
        if (post.author) {
            delete post.author.email;
        }
        return post;
    });
    extraValues = extraValues || {};

    var resp = {
        posts: posts,
        pagination: page.meta.pagination
    };
    return _.extend(resp, extraValues);
}

/**
 * similar to formatPageResponse, but for single post pages
 * @return {Object} containing page variables
 */
function formatResponse(post) {
    // Delete email from author for frontend output
    // TODO: do this on API level if no context is available
    if (post.author) {
        delete post.author.email;
    }

    return {
        post: post
    };
}

function handleError(next) {
    return function (err) {
        return next(err);
    };
}

function setResponseContext(req, res, data) {
    var contexts = [],
        pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
        tagPattern = new RegExp('^\\/' + config.routeKeywords.tag + '\\/'),
        authorPattern = new RegExp('^\\/' + config.routeKeywords.author + '\\/');

    // paged context
    if (!isNaN(pageParam) && pageParam > 1) {
        contexts.push('paged');
    }

    if (req.route.path === '/' + config.routeKeywords.page + '/:page/') {
        contexts.push('index');
    } else if (req.route.path === '/') {
        contexts.push('home');
        contexts.push('index');
    } else if (/\/rss\/(:page\/)?$/.test(req.route.path)) {
        contexts.push('rss');
    } else if (tagPattern.test(req.route.path)) {
        contexts.push('tag');
    } else if (authorPattern.test(req.route.path)) {
        contexts.push('author');
    } else if (data && data.post && data.post.page) {
        contexts.push('page');
    } else {
        contexts.push('post');
    }

    res.locals.context = contexts;
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
    homepage: function (req, res, next) {
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

                    setResponseContext(req, res);
                    res.render(view, formatPageResponse(posts, page));
                });
            });
        }).catch(handleError(next));
    },
    tag: function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam,
                tag: req.params.slug
            };

        // Get url for tag page
        function tagUrl(tag, page) {
            var url = config.paths.subdir + '/' + config.routeKeywords.tag  + '/' + tag + '/';

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
                    var view = template.getThemeViewForTag(paths, options.tag),
                    // Format data for template
                        result = formatPageResponse(posts, page, {
                            tag: page.meta.filters.tags ? page.meta.filters.tags[0] : ''
                        });

                    // If the resulting tag is '' then 404.
                    if (!result.tag) {
                        return next();
                    }
                    setResponseContext(req, res);
                    res.render(view, result);
                });
            });
        }).catch(handleError(next));
    },
    author: function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam,
                author: req.params.slug
            };

        // Get url for tag page
        function authorUrl(author, page) {
            var url = config.paths.subdir + '/' + config.routeKeywords.author + '/' + author + '/';

            if (page && page > 1) {
                url += config.routeKeywords.page + '/' + page + '/';
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
                        result = formatPageResponse(posts, page, {
                            author: page.meta.filters.author ? page.meta.filters.author : ''
                        });

                    // If the resulting author is '' then 404.
                    if (!result.author) {
                        return next();
                    }

                    setResponseContext(req, res);
                    res.render(view, result);
                });
            });
        }).catch(handleError(next));
    },

    single: function (req, res, next) {
        var path = req.path,
            params,
            usingStaticPermalink = false;

        api.settings.read('permalinks').then(function (response) {
            var permalink = response.settings[0],
                editFormat,
                postLookup,
                match;

            editFormat = permalink.value[permalink.value.length - 1] === '/' ? ':edit?' : '/:edit?';

            // Convert saved permalink into a path-match function
            permalink = routeMatch(permalink.value + editFormat);
            match = permalink(path);

            // Check if the path matches the permalink structure.
            //
            // If there are no matches found we then
            // need to verify it's not a static post,
            // and test against that permalink structure.
            if (match === false) {
                match = staticPostPermalink(path);
                // If there are still no matches then return.
                if (match === false) {
                    // Reject promise chain with type 'NotFound'
                    return Promise.reject(new errors.NotFoundError());
                }

                usingStaticPermalink = true;
            }

            params = match;

            // Sanitize params we're going to use to lookup the post.
            postLookup = _.pick(params, 'slug', 'id');
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
                if (params.edit) {
                    params.edit = params.edit.toLowerCase();
                }
                if (params.edit === 'edit') {
                    return res.redirect(config.paths.subdir + '/ghost/editor/' + post.id + '/');
                } else if (params.edit !== undefined) {
                    // reject with type: 'NotFound'
                    return Promise.reject(new errors.NotFoundError());
                }

                setReqCtx(req, post);

                filters.doFilter('prePostsRender', post).then(function (post) {
                    getActiveThemePaths().then(function (paths) {
                        var view = template.getThemeViewForPost(paths, post),
                            response = formatResponse(post);

                        setResponseContext(req, res, response);

                        res.render(view, response);
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

            // If there is an author parameter in the slug, check that the
            // post is actually written by the given author\
            if (params.author) {
                if (post.author.slug === params.author) {
                    return render();
                }
                return next();
            }

            // If there is any date based parameter in the slug
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
        }).catch(function (err) {
            // If we've thrown an error message
            // of type: 'NotFound' then we found
            // no path match.
            if (err.type === 'NotFoundError') {
                return next();
            }

            return handleError(next)(err);
        });
    },
    rss: rss
};

module.exports = frontendControllers;
