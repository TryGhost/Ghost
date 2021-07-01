const _ = require('lodash');
const {SafeString} = require('../../proxy');

function formatEntryData(entry) {
    // feature_image_caption contains HTML, making it a SafeString spares theme devs from triple-curlies
    if (entry.feature_image_caption) {
        entry.feature_image_caption = new SafeString(entry.feature_image_caption);
    }
}

/**
 * @description Formats API response into handlebars/theme format.
 *
 * @return {Object} containing page variables
 */
function formatPageResponse(result) {
    const response = {};

    if (result.posts) {
        response.posts = result.posts;
        response.posts.forEach(formatEntryData);
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
function formatResponse(post) {
    formatEntryData(post);

    return {
        post: post
    };
}

module.exports = {
    entries: formatPageResponse,
    entry: formatResponse
};
