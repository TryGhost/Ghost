var _          = require('lodash'),
    Promise    = require('bluebird'),
    url        = require('url'),
    routeMatch = require('path-match')(),
    api        = require('../../api'),
    config     = require('../../config'),

    editFormat = '/:edit?';

function getEditFormat(linkStructure) {
    return linkStructure.replace(/\/$/, '') + editFormat;
}

function postLookup(postUrl) {
    var postPath = url.parse(postUrl).path,
        postPermalink = config.theme.permalinks,
        pagePermalink = '/:slug/',
        isEditURL = false,
        matchFunc,
        params;

    // Convert saved permalink into a path-match function
    matchFunc = routeMatch(getEditFormat(postPermalink));
    params = matchFunc(postPath);

    // Check if the path matches the permalink structure.
    // If there are no matches found, test to see if this is a page instead
    if (params === false) {
        matchFunc = routeMatch(getEditFormat(pagePermalink));
        params = matchFunc(postPath);
    }

    // If there are still no matches then return empty.
    if (params === false) {
        return Promise.resolve();
    }

    // If params contains edit, and it is equal to 'edit' this is an edit URL
    if (params.edit && params.edit.toLowerCase() === 'edit') {
        postPath = postPath.replace(params.edit + '/', '');
        isEditURL = true;
    } else if (params.edit !== undefined) {
        // Unknown string in URL, return empty
        return Promise.resolve();
    }

    // Sanitize params we're going to use to lookup the post.
    params = _.pick(params, 'slug', 'id');
    // Add author & tag
    params.include = 'author,tags';

    // Query database to find post
    return api.posts.read(params).then(function then(result) {
        var post = result.posts[0];

        // If there is no post, or the post has no URL, or it isn't a match for our original lookup, return empty
        // This also catches the case where we use the pagePermalink but the post is not a page
        if (!post || !post.url || post.url !== postPath) {
            return Promise.resolve();
        }

        return {
            post: post,
            isEditURL: isEditURL
        };
    });
}

module.exports = postLookup;
