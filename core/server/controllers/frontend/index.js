/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var _           = require('lodash'),
    api         = require('../../api'),
    path        = require('path'),
    config      = require('../../config'),
    errors      = require('../../errors'),
    filters     = require('../../filters'),
    Promise     = require('bluebird'),
    templates   = require('./templates'),
    routeMatch  = require('path-match')(),
    handleError = require('./error'),
    formatResponse = require('./format-response'),
    setResponseContext = require('./context'),
    setRequestIsSecure = require('./secure'),

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

frontendControllers = {
    preview: function preview(req, res, next) {
        var params = {
                uuid: req.params.uuid,
                status: 'all',
                include: 'author,tags'
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
        // Add author & tag
        postLookup.include = 'author,tags';

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
