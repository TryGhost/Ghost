/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var _           = require('lodash'),
    api         = require('../api'),
    rss         = require('../data/xml/rss'),
    path        = require('path'),
    config      = require('../config'),
    errors      = require('../errors'),
    filters     = require('../filters'),
    Promise     = require('bluebird'),
    template    = require('../helpers/template'),
    routeMatch  = require('path-match')(),

    frontendControllers,
    staticPostPermalink = routeMatch('/:slug/:edit?');

function getPostPage(options) {
    return api.settings.read('postsPerPage').then(function then(response) {
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
    return {
        post: post
    };
}

function handleError(next) {
    return function handleError(err) {
        // If we've thrown an error message of type: 'NotFound' then we found no path match.
        if (err.errorType === 'NotFoundError') {
            return next();
        }

        return next(err);
    };
}

function setResponseContext(req, res, data) {
    var contexts = [],
        pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
        tagPattern = new RegExp('^\\/' + config.routeKeywords.tag + '\\/'),
        authorPattern = new RegExp('^\\/' + config.routeKeywords.author + '\\/'),
        privatePattern = new RegExp('^\\/' + config.routeKeywords.private + '\\/'),
        indexPattern = new RegExp('^\\/' + config.routeKeywords.page + '\\/'),
        homePattern = new RegExp('^\\/$');

    // paged context
    if (!isNaN(pageParam) && pageParam > 1) {
        contexts.push('paged');
    }

    if (indexPattern.test(res.locals.relativeUrl)) {
        contexts.push('index');
    } else if (homePattern.test(res.locals.relativeUrl)) {
        contexts.push('home');
        contexts.push('index');
    } else if (/^\/rss\//.test(res.locals.relativeUrl)) {
        contexts.push('rss');
    } else if (privatePattern.test(res.locals.relativeUrl)) {
        contexts.push('private');
    } else if (tagPattern.test(res.locals.relativeUrl)) {
        contexts.push('tag');
    } else if (authorPattern.test(res.locals.relativeUrl)) {
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
    (Array.isArray(data) ? data : [data]).forEach(function forEach(d) {
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
    }).then(function then(response) {
        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value];

        return paths;
    });
}

/*
* Sets the response context around a post and renders it
* with the current theme's post view. Used by post preview
* and single post methods.
* Returns a function that takes the post to be rendered.
*/
function renderPost(req, res) {
    return function renderPost(post) {
        return getActiveThemePaths().then(function then(paths) {
            var view = template.getThemeViewForPost(paths, post),
                response = formatResponse(post);

            setResponseContext(req, res, response);
            res.render(view, response);
        });
    };
}

function renderChannel(channelOpts) {
    channelOpts = channelOpts || {};

    return function renderChannel(req, res, next) {
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            options = {
                page: pageParam
            },
            hasSlug,
            filter, filterKey;

        // Add the slug if it exists in the route
        if (channelOpts.route.indexOf(':slug') !== -1) {
            options[channelOpts.name] = req.params.slug;
            hasSlug = true;
        }

        function createUrl(page) {
            var url = config.paths.subdir + channelOpts.route;

            if (hasSlug) {
                url = url.replace(':slug', options[channelOpts.name]);
            }

            if (page && page > 1) {
                url += 'page/' + page + '/';
            }

            return url;
        }

        if (isNaN(pageParam) || pageParam < 1 || (req.params.page !== undefined && pageParam === 1)) {
            return res.redirect(createUrl());
        }

        return getPostPage(options).then(function then(page) {
            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > page.meta.pagination.pages) {
                return res.redirect(createUrl(page.meta.pagination.pages));
            }

            setReqCtx(req, page.posts);
            if (channelOpts.filter && page.meta.filters[channelOpts.filter]) {
                filterKey = page.meta.filters[channelOpts.filter];
                filter = (_.isArray(filterKey)) ? filterKey[0] : filterKey;
                setReqCtx(req, filter);
            }

            filters.doFilter('prePostsRender', page.posts, res.locals).then(function then(posts) {
                getActiveThemePaths().then(function then(paths) {
                    var view = 'index',
                        result,
                        extra = {};

                    if (channelOpts.firstPageTemplate && paths.hasOwnProperty(channelOpts.firstPageTemplate + '.hbs')) {
                        view = (pageParam > 1) ? 'index' : channelOpts.firstPageTemplate;
                    } else if (channelOpts.slugTemplate) {
                        view = template.getThemeViewForChannel(paths, channelOpts.name, options[channelOpts.name]);
                    } else if (paths.hasOwnProperty(channelOpts.name + '.hbs')) {
                        view = channelOpts.name;
                    }

                    if (channelOpts.filter) {
                        extra[channelOpts.name] = (filterKey) ? filter : '';

                        if (!extra[channelOpts.name]) {
                            return next();
                        }

                        result = formatPageResponse(posts, page, extra);
                    } else {
                        result = formatPageResponse(posts, page);
                    }

                    setResponseContext(req, res);
                    res.render(view, result);
                });
            });
        }).catch(handleError(next));
    };
}

frontendControllers = {
    homepage: renderChannel({
        name: 'home',
        route: '/',
        firstPageTemplate: 'home'
    }),
    tag: renderChannel({
        name: 'tag',
        route: '/' + config.routeKeywords.tag + '/:slug/',
        filter: 'tags',
        slugTemplate: true
    }),
    author: renderChannel({
        name: 'author',
        route: '/' + config.routeKeywords.author + '/:slug/',
        filter: 'author',
        slugTemplate: true
    }),
    preview: function preview(req, res, next) {
        var params = {
                uuid: req.params.uuid,
                status: 'all',
                include: 'author,tags,fields'
            };

        api.posts.read(params).then(function then(result) {
            var post = result.posts[0];

            if (!post) {
                return next();
            }

            if (post.status === 'published') {
                return res.redirect(301, config.urlFor('post', {post: post}));
            }

            setReqCtx(req, post);

            filters.doFilter('prePostsRender', post, res.locals)
                .then(renderPost(req, res));
        }).catch(handleError(next));
    },

    single: function single(req, res, next) {
        var postPath = req.path,
            params,
            usingStaticPermalink = false;

        api.settings.read('permalinks').then(function then(response) {
            var permalink = response.settings[0].value,
                editFormat,
                postLookup,
                match;

            editFormat = permalink.substr(permalink.length - 1) === '/' ? ':edit?' : '/:edit?';

            // Convert saved permalink into a path-match function
            permalink = routeMatch(permalink + editFormat);
            match = permalink(postPath);

            // Check if the path matches the permalink structure.
            //
            // If there are no matches found we then
            // need to verify it's not a static post,
            // and test against that permalink structure.
            if (match === false) {
                match = staticPostPermalink(postPath);
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
        }).then(function then(result) {
            var post = result.posts[0],
                postUrl = (params.edit) ? postPath.replace(params.edit + '/', '') : postPath;

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

                filters.doFilter('prePostsRender', post, res.locals)
                    .then(renderPost(req, res));
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

            // Check if the url provided with the post object matches req.path
            // If it does, render the post
            // If not, return 404
            if (post.url && post.url === postUrl) {
                return render();
            } else {
                return next();
            }
        }).catch(handleError(next));
    },
    rss: rss,
    private: function private(req, res) {
        var defaultPage = path.resolve(config.paths.adminViews, 'private.hbs');
        return getActiveThemePaths().then(function then(paths) {
            var data = {};
            if (res.error) {
                data.error = res.error;
            }

            setResponseContext(req, res);
            if (paths.hasOwnProperty('private.hbs')) {
                return res.render('private', data);
            } else {
                return res.render(defaultPage, data);
            }
        });
    }
};

module.exports = frontendControllers;
