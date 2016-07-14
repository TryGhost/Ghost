// Add a new order value to posts_tags based on the existing info
var models   = require('../../../../models'),
    _        = require('lodash'),
    sequence = require('../../../../utils/sequence'),
    migrationHasRunFlag,
    modelOptions;

function loadTagsForEachPost(posts) {
    if (!posts) {
        return [];
    }

    return posts.mapThen(function loadTagsForPost(post) {
        return post.load(['tags'], modelOptions);
    });
}

function updatePostTagsSortOrder(post, tagId, order) {
    var sortOrder = order;
    return function doUpdatePivot() {
        return post.tags().updatePivot(
            {sort_order: sortOrder}, _.extend({}, modelOptions, {query: {where: {tag_id: tagId}}})
        );
    };
}

function buildTagOpsArray(tagOps, post) {
    var order = 0;

    return post.related('tags').reduce(function processTag(tagOps, tag) {
        if (tag.pivot.get('sort_order') > 0) {
            // if any entry in  the posts_tags table has already run, we shouldn't run this again
            migrationHasRunFlag = true;
        }

        tagOps.push(updatePostTagsSortOrder(post, tag.id, order));
        order += 1;

        return tagOps;
    }, tagOps);
}

function processPostsArray(postsArray) {
    return postsArray.reduce(buildTagOpsArray, []);
}

module.exports = function addPostTagOrder(options, logger) {
    modelOptions = options;
    migrationHasRunFlag = false;

    logger.info('Collecting data on tag order for posts...');
    return models.Post.findAll(_.extend({}, modelOptions))
        .then(loadTagsForEachPost)
        .then(processPostsArray)
        .then(function (tagOps) {
            if (tagOps.length > 0 && !migrationHasRunFlag) {
                logger.info('Updating order on ' + tagOps.length + ' tag relationships (could take a while)...');
                return sequence(tagOps).then(function () {
                    logger.info('Tag order successfully updated');
                });
            } else {
                logger.warn('Updating order on tag relationships');
            }
        });
};
