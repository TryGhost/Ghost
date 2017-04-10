var _ = require('lodash'),
    Promise = require('bluebird'),
    api = require('../../../api'),
    models = require('../../../models'),
    utils = require('../../../utils'),
    logging = require('../../../logging'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function TagsMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(TagsMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(TagsMapGenerator.prototype, {
    bindEvents: function () {
        var self = this,
            addOrRemoveTagUrl = function fetchTag(tagName) {
                return models.Tag
                    .findOne({name: tagName}, {
                        include: 'count.posts',
                        context: {
                            public: true
                        }
                    })
                    .then(function (tagModelWithPostsCount) {
                        // CASE: tag is public, connected to a post and get's changed to internal
                        // we don't use filter: 'visibility:public' to detect these changes.
                        if (tagModelWithPostsCount.get('visibility') !== 'public') {
                            self.removeUrl(tagModelWithPostsCount);
                        } else {
                            if (tagModelWithPostsCount.get('count__posts') > 0) {
                                self.addOrUpdateUrl(tagModelWithPostsCount);
                            } else {
                                self.removeUrl(tagModelWithPostsCount);
                            }
                        }
                    })
                    .catch(function (err) {
                        logging.error(err);
                    });
            };

        /**
         * Interesting event to update information like tag name.
         * Tag properties can only be changed in the tag management.
         * We have to ensure a tag, which get's updated is connected to minimum one post.
         */
        this.dataEvents.on('tag.edited', function (tagModel) {
            return addOrRemoveTagUrl(tagModel.get('name'));
        });

        /**
         * Event is **only** triggered when the tag get's physically deleted.
         * This is only possible from the tag management area.
         * This is important to detect, because an auto detach from all posts happens.
         * We have to remove the url in any case!
         */
        this.dataEvents.on('tag.deleted', function (tagModel) {
            self.removeUrl(tagModel);
        });

        /**
         * We have to listen for `tags-updated` event, here are some example cases:
         * e.g. if a tag get's detached, it's covered by `removedTags`
         * e.g. a post is already published and a user attaches an existing tag to it.
         *
         * `removedTags`, `existingTags` and `createdTags` are JSON objects!
         */
        this.dataEvents.on('post.tags-updated', function (postModel) {
            var removedTags = postModel.tagsToRemove || [],
                existingTags = postModel.tagsThatExisted || [],
                createdTags = postModel.tagsToCreate || [];

            return Promise.each(removedTags.concat(existingTags).concat(createdTags), function (tag) {
                return addOrRemoveTagUrl(tag.name);
            });
        });

        /**
         * We have to listen for the `post.unpublished` event, to verify that all
         * tags attached to this post are checked if they have minimum one published post attached.
         * We have to listen for `post.published`, because if you attach tags on a draft, save and later publish
         * the post, no tag urls are added/updated/removed.
         */
        this.dataEvents.onMany(['post.published', 'post.unpublished'], function (postModel) {
            postModel.load('tags')
                .then(function (postModelWithTags) {
                    return Promise.each(postModelWithTags.related('tags').models, function (tagModel) {
                        return addOrRemoveTagUrl(tagModel.get('name'));
                    });
                });
        });
    },

    getData: function () {
        return api.tags.browse({
            context: {
                public: true
            },
            filter: 'visibility:public',
            limit: 'all',
            include: 'count.posts'
        }).then(function (resp) {
            return _.filter(resp.tags, function (tag) {
                return tag.count.posts > 0;
            });
        });
    },

    validateDatum: function (datum) {
        return datum.visibility === 'public';
    },

    getUrlForDatum: function (tag) {
        return utils.url.urlFor('tag', {tag: tag}, true);
    },

    getPriorityForDatum: function () {
        // TODO: We could influence this with meta information
        return 0.6;
    }
});

module.exports = TagsMapGenerator;
