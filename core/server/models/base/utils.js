/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _ = require('lodash'),
    collectionQuery,
    filtering,
    addPostCount,
    tagUpdate;

addPostCount = function addPostCount(options, itemCollection) {
    if (options.include && options.include.indexOf('post_count') > -1) {
        itemCollection.query('columns', 'tags.*', function (qb) {
            qb.count('posts_tags.post_id').from('posts_tags').whereRaw('tag_id = tags.id').as('post_count');
        });

        options.withRelated = _.pull([].concat(options.withRelated), 'post_count');
        options.include = _.pull([].concat(options.include), 'post_count');
    }
};

collectionQuery = {
    count: function count(collection, options) {
        addPostCount(options, collection);
    }
};

filtering = {
    preFetch: function preFetch(filterObjects) {
        var promises = [];
        _.forOwn(filterObjects, function (obj) {
            promises.push(obj.fetch());
        });

        return promises;
    },
    query: function query(filterObjects, itemCollection) {
        if (filterObjects.tags) {
            itemCollection
                .query('join', 'posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                .query('where', 'posts_tags.tag_id', '=', filterObjects.tags.id);
        }

        if (filterObjects.author) {
            itemCollection
                .query('where', 'author_id', '=', filterObjects.author.id);
        }

        if (filterObjects.roles) {
            itemCollection
                .query('join', 'roles_users', 'roles_users.user_id', '=', 'users.id')
                .query('where', 'roles_users.role_id', '=', filterObjects.roles.id);
        }
    },
    formatResponse: function formatResponse(filterObjects, options, data) {
        if (!_.isEmpty(filterObjects)) {
            data.meta.filters = {};
        }

        _.forOwn(filterObjects, function (obj, key) {
            if (!filterObjects[key].isNew()) {
                data.meta.filters[key] = [filterObjects[key].toJSON(options)];
            }
        });

        return data;
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

module.exports.filtering = filtering;
module.exports.collectionQuery = collectionQuery;
module.exports.addPostCount = addPostCount;
module.exports.tagUpdate = tagUpdate;
