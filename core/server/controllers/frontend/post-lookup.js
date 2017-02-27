var _          = require('lodash'),
    Promise    = require('bluebird'),
    url        = require('url'),
    routeMatch = require('path-match')(),
    api        = require('../../api'),
    settingsCache = require('../../settings/cache'),
    optionsFormat = '/:options?';

function getOptionsFormat(linkStructure) {
    return linkStructure.replace(/\/$/, '') + optionsFormat;
}

function postLookup(postUrl) {
    var postPath = url.parse(postUrl).path,
        postPermalink = settingsCache.get('permalinks'),
        pagePermalink = '/:slug/',
        isEditURL = false,
        matchFuncPost,
        matchFuncPage,
        postParams,
        params;

    // Convert saved permalink into a path-match function
    matchFuncPost = routeMatch(getOptionsFormat(postPermalink));
    matchFuncPage = routeMatch(getOptionsFormat(pagePermalink));

    postParams = matchFuncPost(postPath);

    // Check if the path matches the permalink structure.
    // If there are no matches found, test to see if this is a page instead
    params = postParams || matchFuncPage(postPath);

    // if there are no matches for either then return empty
    if (params === false) {
        return Promise.resolve();
    }

    // If params contains options, and it is equal to 'edit', this is an edit URL
    if (params.options && params.options.toLowerCase() === 'edit') {
        isEditURL = true;
    }

    // Query database to find post
    return api.posts.read(_.extend(_.pick(params, 'slug', 'id'), {include: 'author,tags'})).then(function then(result) {
        var post = result.posts[0];

        if (!post) {
            return Promise.resolve();
        }

        // CASE: we originally couldn't match the post based on date permalink and we tried to check if its a page
        if (!post.page && !postParams) {
            return Promise.resolve();
        }

        // CASE: we only support /:slug format for pages
        if (post.page && matchFuncPage(postPath) === false) {
            return Promise.resolve();
        }

        return {
            post: post,
            isEditURL: isEditURL,
            isUnknownOption: isEditURL ? false : params.options ? true : false
        };
    });
}

module.exports = postLookup;
