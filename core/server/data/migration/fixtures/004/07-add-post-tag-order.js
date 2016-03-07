// Add a new order value to posts_tags based on the existing info
var models   = require('../../../../models'),
    _        = require('lodash'),
    sequence = require('../../../../utils/sequence');

module.exports = function addPostTagOrder(options, logInfo) {
    var tagOps = [];
    logInfo('Collecting data on tag order for posts...');
    return models.Post.findAll(_.extend({}, options)).then(function (posts) {
        if (posts) {
            return posts.mapThen(function (post) {
                return post.load(['tags']);
            });
        }
        return [];
    }).then(function (posts) {
        _.each(posts, function (post) {
            var order = 0;
            post.related('tags').each(function (tag) {
                tagOps.push((function (order) {
                    var sortOrder = order;
                    return function () {
                        return post.tags().updatePivot(
                            {sort_order: sortOrder}, _.extend({}, options, {query: {where: {tag_id: tag.id}}})
                        );
                    };
                }(order)));
                order += 1;
            });
        });

        if (tagOps.length > 0) {
            logInfo('Updating order on ' + tagOps.length + ' tag relationships (could take a while)...');
            return sequence(tagOps).then(function () {
                logInfo('Tag order successfully updated');
            });
        }
    });
};
