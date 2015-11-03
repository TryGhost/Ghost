/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _ = require('lodash'),
    processGQLResult,
    tagUpdate;

processGQLResult = function processGQLResult(itemCollection, options) {
    var joinTables = options.filter.joins,
        tagsHasIn = false;

    if (joinTables && joinTables.indexOf('tags') > -1) {
        // We need to use leftOuterJoin to insure we still include posts which don't have tags in the result
        // The where clause should restrict which items are returned
        itemCollection
            .query('leftOuterJoin', 'posts_tags', 'posts_tags.post_id', '=', 'posts.id')
            .query('leftOuterJoin', 'tags', 'posts_tags.tag_id', '=', 'tags.id');

        // The order override should ONLY happen if we are doing an "IN" query
        // TODO move the order handling to the query building that is currently inside pagination
        // TODO make the order handling in pagination handle orderByRaw
        // TODO extend this handling to all joins
        _.each(options.filter.statements, function (statement) {
            if (statement.op === 'IN' && statement.prop.match(/tags/)) {
                tagsHasIn = true;
            }
        });

        if (tagsHasIn) {
            // TODO make this count the number of MATCHING tags, not just the number of tags
            itemCollection.query('orderByRaw', 'count(tags.id) DESC');
        }

        // We need to add a group by to counter the double left outer join
        // TODO improve on th group by handling
        options.groups = options.groups || [];
        options.groups.push('posts.id');
    }

    if (joinTables && joinTables.indexOf('author') > -1) {
        itemCollection
            .query('join', 'users as author', 'author.id', '=', 'posts.author_id');
    }
};

tagUpdate = {
    fetchCurrentPost: function fetchCurrentPost(PostModel, id, options) {
        return PostModel.forge({id: id}).fetch(_.extend({}, options, {withRelated: ['tags']}));
    },

    fetchMatchingTags: function fetchMatchingTags(TagModel, tagsToMatch, options) {
        if (_.isEmpty(tagsToMatch)) {
            return false;
        }
        return TagModel.forge()
            .query('whereIn', 'name', _.pluck(tagsToMatch, 'name')).fetchAll(options);
    },

    detachTagFromPost: function detachTagFromPost(post, tag, options) {
        return function () {
            // See tgriesser/bookshelf#294 for an explanation of _.omit(options, 'query')
            return post.tags().detach(tag.id, _.omit(options, 'query'));
        };
    },

    attachTagToPost: function attachTagToPost(post, tag, index, options) {
        return function () {
            // See tgriesser/bookshelf#294 for an explanation of _.omit(options, 'query')
            return post.tags().attach({tag_id: tag.id, sort_order: index}, _.omit(options, 'query'));
        };
    },

    createTagThenAttachTagToPost: function createTagThenAttachTagToPost(TagModel, post, tag, index, options) {
        return function () {
            return TagModel.add({name: tag.name}, options).then(function then(createdTag) {
                return tagUpdate.attachTagToPost(post, createdTag, index, options)();
            });
        };
    },

    updateTagOrderForPost: function updateTagOrderForPost(post, tag, index, options) {
        return function () {
            return post.tags().updatePivot(
                {sort_order: index}, _.extend({}, options, {query: {where: {tag_id: tag.id}}})
            );
        };
    },

    // Test if two tags are the same, checking ID first, and falling back to name
    tagsAreEqual: function tagsAreEqual(tag1, tag2) {
        if (tag1.hasOwnProperty('id') && tag2.hasOwnProperty('id')) {
            return parseInt(tag1.id, 10) === parseInt(tag2.id, 10);
        }
        return tag1.name.toString() === tag2.name.toString();
    },
    tagSetsAreEqual: function tagSetsAreEqual(tags1, tags2) {
        // If the lengths are different, they cannot be the same
        if (tags1.length !== tags2.length) {
            return false;
        }
        // Return if no item is not the same (double negative is horrible)
        return !_.any(tags1, function (tag1, index) {
            return !tagUpdate.tagsAreEqual(tag1, tags2[index]);
        });
    }
};

module.exports.processGQLResult = processGQLResult;
module.exports.tagUpdate = tagUpdate;
