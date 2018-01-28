'use strict';

const debug = require('ghost-ignition').debug('importer:posts'),
    _ = require('lodash'),
    uuid = require('uuid'),
    BaseImporter = require('./base'),
    validation = require('../../../validation');

class PostsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Post',
            dataKeyToImport: 'posts',
            requiredFromFile: ['tags', 'posts_tags']
        });

        this.legacyKeys = {
            image: 'feature_image'
        };
    }

    sanitizeAttributes() {
        _.each(this.dataToImport, (obj) => {
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
        let postTags = this.requiredFromFile.posts_tags,
            postsWithTags = new Map(),
            duplicatedTagsPerPost = {},
            tagsToAttach = [],
            foundOriginalTag;

        postTags = _.orderBy(postTags, ['post_id', 'sort_order'], ['asc', 'asc']);

        _.each(postTags, (postTag) => {
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

        postsWithTags.forEach((tagIds, postId) => {
            tagsToAttach = [];

            _.each(tagIds, (tagId) => {
                foundOriginalTag = _.find(this.requiredFromFile.tags, {id: tagId});

                if (!foundOriginalTag) {
                    return;
                }

                tagsToAttach.push(foundOriginalTag);
            });

            _.each(tagsToAttach, (tag) => {
                _.each(this.dataToImport, (obj) => {
                    if (obj.id === postId) {
                        if (!_.isArray(obj.tags)) {
                            obj.tags = [];
                        }

                        if (duplicatedTagsPerPost.hasOwnProperty(postId) && duplicatedTagsPerPost[postId].length) {
                            this.problems.push({
                                message: 'Detected duplicated tags for: ' + obj.title || obj.slug,
                                help: this.modelName,
                                context: JSON.stringify({
                                    tags: _.map(_.filter(this.requiredFromFile.tags, (tag) => {
                                        return _.indexOf(duplicatedTagsPerPost[postId], tag.id) !== -1;
                                    }), (value) => {
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
        let mobileDocContent;

        this.sanitizeAttributes();
        this.addTagsToPosts();

        // Remove legacy field language
        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return _.omit(data, 'language');
        });

        this.dataToImport = this.dataToImport.map(this.legacyMapper);

        // For legacy imports/custom imports with only html we can parse the markdown or html into a mobile doc card
        // For now we can hardcode the version
        _.each(this.dataToImport, (model) => {
            if (!model.mobiledoc) {
                if (model.markdown && model.markdown.length > 0) {
                    mobileDocContent = model.markdown;
                } else if (model.html && model.html.length > 0) {
                    mobileDocContent = model.html;
                } else {
                    // Set mobileDocContent to null else it will affect empty posts
                    mobileDocContent = null;
                }
                if (mobileDocContent) {
                    model.mobiledoc = JSON.stringify({
                        version: '0.3.1',
                        markups: [],
                        atoms: [],
                        cards: [['card-markdown', {cardName: 'card-markdown', markdown: mobileDocContent}]],
                        sections: [[10, 0]]
                    });
                }
            }

            // NOTE: we remember the old post id for disqus
            // We also check if amp already exists to prevent
            // overwriting any comment ids from a 1.0 export
            // (see https://github.com/TryGhost/Ghost/issues/8963)
            if (model.id && !model.amp) {
                model.amp = model.id.toString();
            }
        });

        // NOTE: We only support removing duplicate posts within the file to import.
        // For any further future duplication detection, see https://github.com/TryGhost/Ghost/issues/8717.
        let slugs = [];
        this.dataToImport = _.filter(this.dataToImport, (post) => {
            if (slugs.indexOf(post.slug) !== -1) {
                this.problems.push({
                    message: 'Entry was not imported and ignored. Detected duplicated entry.',
                    help: this.modelName,
                    context: JSON.stringify({
                        post: post
                    })
                });

                return false;
            }

            slugs.push(post.slug);
            return true;
        });

        // NOTE: do after, because model properties are deleted e.g. post.id
        return super.beforeImport();
    }

    doImport(options, importOptions) {
        return super.doImport(options, importOptions);
    }
}

module.exports = PostsImporter;
