const _ = require('lodash');

/**
 * formats variables for handlebars in multi-post contexts.
 * If extraValues are available, they are merged in the final value
 * @return {Object} containing page variables
 */
function formatPageResponse(result) {
    var response = {};

    if (result.posts) {
        response.posts = result.posts;
    }

    if (result.meta && result.meta.pagination) {
        response.pagination = result.meta.pagination;
    }

    _.each(result.data, function (data, name) {
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

    return response;
}

/**
 * similar to formatPageResponse, but for entries (post or page)
 *
 * @TODO
 * In the future, we should return {page: entry} or {post:entry).
 * But for now, we would break the themes if we just change it.
 *
 * @return {Object} containing page variables
 */
function formatResponse(post) {
    return {
        post: post
    };
}

module.exports = {
    entries: formatPageResponse,
    entry: formatResponse
};
