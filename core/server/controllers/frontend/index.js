/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var _           = require('lodash'),
    api         = require('../../api'),
    rss         = require('../../data/xml/rss'),
    path        = require('path'),
    config      = require('../../config'),
    errors      = require('../../errors'),
    filters     = require('../../filters'),
    Promise     = require('bluebird'),
    templates    = require('./templates'),
    routeMatch  = require('path-match')(),
    safeString  = require('../../utils/index').safeString,
    handleError = require('./error'),
    fetchData   = require('./fetch-data'),
    formatResponse = require('./format-response'),
    channelConfig  = require('./channel-config'),
    setResponseContext = require('./context'),
    setRequestIsSecure   = require('./secure'),

    frontendControllers,
    staticPostPermalink = routeMatch('/:slug/:edit?');

/*
* Sets the response context around a post and renders it
* with the current theme's post view. Used by post preview
* and single post methods.
* Returns a function that takes the post to be rendered.
*/
function renderPost(req, res) {
    return function renderPost(post) {
        var view = templates.single(req.app.get('activeTheme'), post),
            response = formatResponse.single(post);

        setResponseContext(req, res, response);
        res.render(view, response);
    };
}

function renderChannel(name) {
    return function renderChannel(req, res, next) {
        // Parse the parameters we need from the URL
        var channelOpts = channelConfig(name),
            pageParam = req.params.page !== undefined ? req.params.page : 1,
            slugParam = req.params.slug ? safeString(req.params.slug) : undefined;

        // Ensure we at least have an empty object for postOptions
        channelOpts.postOptions = channelOpts.postOptions || {};
        // Set page on postOptions for the query made later
        channelOpts.postOptions.page = pageParam;
        channelOpts.slugParam = slugParam;

        // Call fetchData to get everything we need from the API
        return fetchData(channelOpts).then(function handleResult(result) {
            // If page is greater than number of pages we have, go straight to 404
            if (pageParam > result.meta.pagination.pages) {
                return next(new errors.NotFoundError());
            }

            // @TODO: figure out if this can be removed, it's supposed to ensure that absolutely URLs get generated
            // correctly for the various objects, but I believe it doesn't work and a different approach is needed.
            setRequestIsSecure(req, result.posts);
            _.each(result.data, function (data) {
                setRequestIsSecure(req, data);
            });

            // @TODO: properly design these filters
            filters.doFilter('prePostsRender', result.posts, res.locals).then(function then(posts) {
                var view = templates.channel(req.app.get('activeTheme'), channelOpts);

                // Do final data formatting and then render
                result.posts = posts;
                result = formatResponse.channel(result);
                setResponseContext(req, res);
                res.render(view, result);
            });
        }).catch(handleError(next));
    };
}

frontendControllers = {
    index: renderChannel('index'),
    tag: renderChannel('tag'),
    author: renderChannel('author'),
    rss: function (req, res, next) {
        // Temporary hack, channels will allow us to resolve this better eventually
        var tagPattern = new RegExp('^\\/' + config.routeKeywords.tag + '\\/.+'),
            authorPattern = new RegExp('^\\/' + config.routeKeywords.author + '\\/.+');

        if (tagPattern.test(res.locals.relativeUrl)) {
            req.channelConfig = channelConfig('tag');
        } else if (authorPattern.test(res.locals.relativeUrl)) {
            req.channelConfig = channelConfig('author');
        } else {
            req.channelConfig = channelConfig('index');
        }

        req.channelConfig.isRSS = true;

        return rss(req, res, next);
    },

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

            setRequestIsSecure(req, post);

            filters.doFilter('prePostsRender', post, res.locals)
                .then(renderPost(req, res));
        }).catch(handleError(next));
    },
    single: function single(req, res, next) {
        var postPath = req.path,
            params,
            usingStaticPermalink = false,
            permalink = config.theme.permalinks,
            editFormat = permalink.substr(permalink.length - 1) === '/' ? ':edit?' : '/:edit?',
            postLookup,
            match;

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
            // If there are still no matches then call next.
            if (match === false) {
                return next();
            }

            usingStaticPermalink = true;
        }

        params = match;

        // Sanitize params we're going to use to lookup the post.
        postLookup = _.pick(params, 'slug', 'id');
        // Add author, tag and fields
        postLookup.include = 'author,tags,fields';

        // Query database to find post
        return api.posts.read(postLookup).then(function then(result) {
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

                setRequestIsSecure(req, post);

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
    private: function private(req, res) {
        var defaultPage = path.resolve(config.paths.adminViews, 'private.hbs'),
            paths = templates.getActiveThemePaths(req.app.get('activeTheme')),
            data = {};

        if (res.error) {
            data.error = res.error;
        }

        setResponseContext(req, res);
        if (paths.hasOwnProperty('private.hbs')) {
            return res.render('private', data);
        } else {
            return res.render(defaultPage, data);
        }
    }
};

module.exports = frontendControllers;
