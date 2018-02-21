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
            requiredFromFile: ['posts', 'tags', 'posts_tags'],
            requiredImportedData: ['tags'],
            requiredExistingData: ['tags']
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
     * Naive function to attach related tags.
     * Target tags should not be created. We add the relation by foreign key.
     */
    addNestedRelations() {
        this.requiredFromFile.posts_tags = _.orderBy(this.requiredFromFile.posts_tags, ['post_id', 'sort_order'], ['asc', 'asc']);

        /**
         * {post_id: 1, tag_id: 2}
         */
        _.each(this.requiredFromFile.posts_tags, (postTagRelation) => {
            if (!postTagRelation.post_id) {
                return;
            }

            let postToImport = _.find(this.dataToImport, {id: postTagRelation.post_id});

            // CASE: we won't import a relation when the target post does not exist
            if (!postToImport) {
                return;
            }

            if (!postToImport.tags || !_.isArray(postToImport.tags)) {
                postToImport.tags = [];
            }

            // CASE: duplicate relation?
            if (!_.find(postToImport.tags, {tag_id: postTagRelation.tag_id})) {
                postToImport.tags.push({
                    tag_id: postTagRelation.tag_id
                });
            }
        });
    }

    /**
     * Replace all `tag_id` references.
     */
    replaceIdentifiers() {
        /**
         * {post_id: 1, tag_id: 2}
         */
        _.each(this.dataToImport, (postToImport, postIndex) => {
            if (!postToImport.tags || !postToImport.tags.length) {
                return;
            }

            let indexesToRemove = [];
            _.each(postToImport.tags, (tag, tagIndex) => {
                let tagInFile = _.find(this.requiredFromFile.tags, {id: tag.tag_id});

                if (!tagInFile) {
                    let existingTag = _.find(this.requiredExistingData.tags, {id: tag.tag_id});

                    // CASE: tag is not in file, tag is not in db
                    if (!existingTag) {
                        indexesToRemove.push(tagIndex);
                        return;
                    } else {
                        this.dataToImport[postIndex].tags[tagIndex].tag_id = existingTag.id;
                        return;
                    }
                }

                // CASE: search through imported data
                let importedTag = _.find(this.requiredImportedData.tags, {slug: tagInFile.slug});

                if (importedTag) {
                    this.dataToImport[postIndex].tags[tagIndex].tag_id = importedTag.id;
                    return;
                }

                // CASE: search through existing data
                let existingTag = _.find(this.requiredExistingData.tags, {slug: tagInFile.slug});

                if (existingTag) {
                    this.dataToImport[postIndex].tags[tagIndex].tag_id = existingTag.id;
                } else {
                    indexesToRemove.push(tagIndex);
                }
            });

            this.dataToImport[postIndex].tags = _.filter(this.dataToImport[postIndex].tags, ((tag, index) => {
                return indexesToRemove.indexOf(index) === -1;
            }));
        });

        return super.replaceIdentifiers();
    }

    beforeImport() {
        debug('beforeImport');
        let mobileDocContent;

        this.sanitizeAttributes();
        this.addNestedRelations();

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
