var urlService = require('../services/url'),
    filters = require('../filters'),
    handleError = require('./frontend/error'),
    postLookup = require('./frontend/post-lookup'),
    renderEntry = require('./frontend/render-entry'),
    setRequestIsSecure = require('./frontend/secure');

// This here is a controller.
// It renders entries = individual posts or pages
// The "route" is handled in site/routes.js
module.exports = function entryController(req, res, next) {
    // Note: this is super similar to the config middleware used in channels
    // @TODO refactor into to something explicit
    res._route = {
        type: 'entry'
    };

    // Query database to find post
    return postLookup(req.path).then(function then(lookup) {
        // Format data 1
        var post = lookup ? lookup.post : false;

        if (!post) {
            return next();
        }

        // CASE: postlookup can detect options for example /edit, unknown options get ignored and end in 404
        if (lookup.isUnknownOption) {
            return next();
        }

        // CASE: last param is of url is /edit, redirect to admin
        if (lookup.isEditURL) {
            return urlService.utils.redirectToAdmin(302, res, '#/editor/' + post.id);
        }

        // CASE: permalink is not valid anymore, we redirect him permanently to the correct one
        if (post.url !== req.path) {
            return urlService.utils.redirect301(res, post.url);
        }

        setRequestIsSecure(req, post);

        filters.doFilter('prePostsRender', post, res.locals)
            .then(renderEntry(req, res));
    }).catch(handleError(next));
};
