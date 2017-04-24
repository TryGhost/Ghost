/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _ = require('lodash'),
    Promise = require('bluebird'),
    ObjectId = require('bson-objectid'),
    errors = require('../../errors'),
    tagUpdate, attach;

/**
 * Attach wrapper (please never call attach manual!)
 *
 * We register the creating event to be able to hook into the model creation process of Bookshelf.
 * We need to load the model again, because of a known bookshelf issue:
 * see https://github.com/tgriesser/bookshelf/issues/629
 * (withRelated option causes a null value for the foreign key)
 *
 * roles [1,2]
 * roles [{id: 1}, {id: 2}]
 * roles [{role_id: 1}]
 * roles [BookshelfModel]
 */
attach = function attach(Model, effectedModelId, relation, modelsToAttach, options) {
    options = options || {};

    var fetchedModel,
        localOptions = {transacting: options.transacting};

    return Model.forge({id: effectedModelId}).fetch(localOptions)
        .then(function successFetchedModel(_fetchedModel) {
            fetchedModel = _fetchedModel;

            if (!fetchedModel) {
                throw new errors.NotFoundError({level: 'critical', help: effectedModelId});
            }

            fetchedModel.related(relation).on('creating', function (collection, data) {
                data.id = ObjectId.generate();
            });

            return Promise.resolve(modelsToAttach)
                .then(function then(models) {
                    models = _.map(models, function mapper(model) {
                        if (model.id) {
                            return model.id;
                        } else if (!_.isObject(model)) {
                            return model.toString();
                        } else {
                            return model;
                        }
                    });

                    return fetchedModel.related(relation).attach(models, localOptions);
                });
        })
        .finally(function () {
            if (!fetchedModel) {
                return;
            }

            fetchedModel.related(relation).off('creating');
        });
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
            .query('whereIn', 'name', _.map(tagsToMatch, 'name')).fetchAll(options);
    },

    detachTagFromPost: function detachTagFromPost(post, tag, options) {
        return function () {
            // See tgriesser/bookshelf#294 for an explanation of _.omit(options, 'query')
            return post.tags().detach(tag.id, _.omit(options, 'query'));
        };
    },

    attachTagToPost: function attachTagToPost(Post, postId, tag, index, options) {
        return function () {
            // See tgriesser/bookshelf#294 for an explanation of _.omit(options, 'query')
            return attach(Post, postId, 'tags', [{tag_id: tag.id, sort_order: index}], _.omit(options, 'query'));
        };
    },

    createTagThenAttachTagToPost: function createTagThenAttachTagToPost(PostModel, TagModel, post, tag, index, options) {
        var fields = ['name', 'slug', 'description', 'feature_image', 'visibility', 'parent_id', 'meta_title', 'meta_description'];
        return function () {
            return TagModel.add(_.pick(tag, fields), options).then(function then(createdTag) {
                return tagUpdate.attachTagToPost(PostModel, post.id, createdTag, index, options)();
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
            return tag1.id === tag2.id;
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

module.exports.attach = attach;
module.exports.tagUpdate = tagUpdate;
