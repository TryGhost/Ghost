var _   = require('lodash');

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

module.exports = {
    channel: formatPageResponse,
    single: formatResponse
};
