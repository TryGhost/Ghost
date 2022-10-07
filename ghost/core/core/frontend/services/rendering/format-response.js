const _ = require('lodash');
const {prepareContextResource} = require('../proxy');

/**
 * @description Formats API response into handlebars/theme format.
 *
 * @return {Object} containing page variables
 */
function formatPageResponse(result, pageAsPost = false) {
    const response = {};

    if (result.posts) {
        response.posts = result.posts;
        prepareContextResource(response.posts);
    }

    if (result.meta && result.meta.pagination) {
        response.pagination = result.meta.pagination;
    }

    _.each(result.data, function (data, name) {
        prepareContextResource(data);

        if (data.meta) {
            // Move pagination to be a top level key
            response[name] = data;
            response[name].pagination = data.meta.pagination;
            delete response[name].meta;
        } else {
            // This is a single object, don't wrap it in an array
            response[name] = data[0];
        }
    });

    if (pageAsPost && response.page) {
        response.post = response.page;
    }

    return response;
}

/**
 * @description Format a single resource for handlebars.
 *
 * @TODO
 * In the future, we should return {page: entry} or {post:entry).
 * But for now, we would break the themes if we just change it.
 *
 * @see https://github.com/TryGhost/Ghost/issues/10042.
 *
 * @return {Object} containing page variables
 */
function formatResponse(post, context) {
    prepareContextResource(post);

    let entry = {
        post: post
    };

    // NOTE: preview context is a special case where the internal preview api returns the post model's type field
    if (context?.includes('page') || (context?.includes('preview') && post.type === 'page')) {
        entry.page = post;
    }

    return entry;
}

module.exports = {
    entries: formatPageResponse,
    entry: formatResponse
};
