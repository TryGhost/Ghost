'use strict';

const debug = require('ghost-ignition').debug('importer:posts'),
    _ = require('lodash'),
    uuid = require('uuid'),
    BaseImporter = require('./base'),
    validation = require('../../../validation');

class PostsImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'Post',
            dataKeyToImport: 'posts',
            requiredData: ['tags', 'posts_tags']
        }));
    }

    sanitizeAttributes() {
        _.each(this.dataToImport, function (obj) {
            if (!validation.validator.isUUID(obj.uuid || '')) {
                obj.uuid = uuid.v4();
            }
        });
    }

    /**
     * We don't have to worry about existing tag id's.
     * e.g. you import a tag, which exists (doesn't get imported)
     * ...because we add tags by unique name.
     */
    addTagsToPosts() {
        let postTags = this.posts_tags,
            postsWithTags = new Map(),
            self = this,
            tags,
            duplicatedTagsPerPost = {};

        _.each(postTags, function (postTag) {
            if (!postsWithTags.get(postTag.post_id)) {
                postsWithTags.set(postTag.post_id, []);
            }

            if (postsWithTags.get(postTag.post_id).indexOf(postTag.tag_id) !== -1) {
                if (!duplicatedTagsPerPost.hasOwnProperty(postTag.post_id)) {
                    duplicatedTagsPerPost[postTag.post_id] = [];
                }

                duplicatedTagsPerPost[postTag.post_id].push(postTag.tag_id);
            }

            postsWithTags.get(postTag.post_id).push(postTag.tag_id);
        });

        postsWithTags.forEach(function (tagIds, postId) {
            tags = _.filter(self.tags, function (tag) {
                return _.indexOf(tagIds, tag.id) !== -1;
            });

            _.each(tags, function (tag) {
                _.each(self.dataToImport, function (obj) {
                    if (obj.id === postId) {
                        if (!_.isArray(obj.tags)) {
                            obj.tags = [];
                        }

                        if (duplicatedTagsPerPost.hasOwnProperty(postId) && duplicatedTagsPerPost[postId].length) {
                            self.problems.push({
                                message: 'Detected duplicated tags for: ' + obj.title || obj.slug,
                                help: self.modelName,
                                context: JSON.stringify({
                                    tags: _.map(_.filter(self.tags, function (tag) {
                                        return _.indexOf(duplicatedTagsPerPost[postId], tag.id) !== -1;
                                    }), function (value) {
                                        return value.slug || value.name;
                                    })
                                })
                            });
                        }

                        obj.tags.push({
                            name: tag.name
                        });
                    }
                });
            });
        });
    }

    beforeImport() {
        debug('beforeImport');

        this.sanitizeAttributes();
        this.addTagsToPosts();

        // NOTE: do after, because model properties are deleted e.g. post.id
        return super.beforeImport();
    }

    doImport(options) {
        return super.doImport(options);
    }
}

module.exports = PostsImporter;
