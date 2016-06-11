/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _ = require('lodash'),
    tagUpdate;

tagUpdate = {
    fetchCurrentPost: function fetchCurrentPost(PostModel, id, options) {
        return PostModel.forge({id: id}).fetch(_.extend({}, options, {withRelated: ['tags']}));
    },

    fetchMatchingTags: function fetchMatchingTags(TagModel, tagsToMatch, options) {
        if (_.isEmpty(tagsToMatch)) {
            return false;
        }
        return TagModel.forge()
            .query('whereIn', 'name', _.map(tagsToMatch, 'name')).fetchAll(options);
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
        var fields = ['name', 'slug', 'description', 'image', 'visibility', 'parent_id', 'meta_title', 'meta_description'];
        return function () {
            return TagModel.add(_.pick(tag, fields), options).then(function then(createdTag) {
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
        return !_.some(tags1, function (tag1, index) {
            return !tagUpdate.tagsAreEqual(tag1, tags2[index]);
        });
    }
};

module.exports.tagUpdate = tagUpdate;
