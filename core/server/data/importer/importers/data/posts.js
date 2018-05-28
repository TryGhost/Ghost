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
            requiredFromFile: ['posts', 'tags', 'posts_tags', 'posts_authors'],
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
     * Naive function to attach related tags and authors.
     */
    addNestedRelations() {
        this.requiredFromFile.posts_tags = _.orderBy(this.requiredFromFile.posts_tags, ['post_id', 'sort_order'], ['asc', 'asc']);
        this.requiredFromFile.posts_authors = _.orderBy(this.requiredFromFile.posts_authors, ['post_id', 'sort_order'], ['asc', 'asc']);

        /**
         * from {post_id: 1, tag_id: 2} to post.tags=[{id:id}]
         * from {post_id: 1, author_id: 2} post.authors=[{id:id}]
         */
        const run = (relations, target, fk) => {
            _.each(relations, (relation) => {
                if (!relation.post_id) {
                    return;
                }

                let postToImport = _.find(this.dataToImport, {id: relation.post_id});

                // CASE: we won't import a relation when the target post does not exist
                if (!postToImport) {
                    return;
                }

                if (!postToImport[target] || !_.isArray(postToImport[target])) {
                    postToImport[target] = [];
                }

                // CASE: detect duplicate relations
                if (!_.find(postToImport[target], {id: relation[fk]})) {
                    postToImport[target].push({
                        id: relation[fk]
                    });
                }
            });
        };

        run(this.requiredFromFile.posts_tags, 'tags', 'tag_id');
        run(this.requiredFromFile.posts_authors, 'authors', 'author_id');
    }

    /**
     * Replace all identifier references.
     */
    replaceIdentifiers() {
        const ownerUserId = _.find(this.requiredExistingData.users, (user) => {
            if (user.roles[0].name === 'Owner') {
                return true;
            }
        }).id;

        const run = (postToImport, postIndex, targetProperty, tableName) => {
            if (!postToImport[targetProperty] || !postToImport[targetProperty].length) {
                return;
            }

            let indexesToRemove = [];
            _.each(postToImport[targetProperty], (object, index) => {
                // this is the original relational object (old id)
                let objectInFile = _.find(this.requiredFromFile[tableName], {id: object.id});

                if (!objectInFile) {
                    let existingObject = _.find(this.requiredExistingData[tableName], {id: object.id});

                    // CASE: is not in file, is not in db
                    if (!existingObject) {
                        indexesToRemove.push(index);
                        return;
                    } else {
                        this.dataToImport[postIndex][targetProperty][index].id = existingObject.id;
                        return;
                    }
                }

                // CASE: search through imported data.
                // EDGE CASE: uppercase tag slug was imported and auto modified
                let importedObject = _.find(this.requiredImportedData[tableName], {originalSlug: objectInFile.slug});

                if (importedObject) {
                    this.dataToImport[postIndex][targetProperty][index].id = importedObject.id;
                    return;
                }

                // CASE: search through existing data by unique attribute
                let existingObject = _.find(this.requiredExistingData[tableName], {slug: objectInFile.slug});

                if (existingObject) {
                    this.dataToImport[postIndex][targetProperty][index].id = existingObject.id;
                } else {
                    indexesToRemove.push(index);
                }
            });

            this.dataToImport[postIndex][targetProperty] = _.filter(this.dataToImport[postIndex][targetProperty], ((object, index) => {
                return indexesToRemove.indexOf(index) === -1;
            }));

            // CASE: we had to remove all the relations, because we could not match or find the relation reference.
            // e.g. you import a post with multiple authors. Only the primary author is assigned.
            // But the primary author won't be imported and we can't find the author in the existing database.
            // This would end in `post.authors = []`, which is not allowed. There must be always minimum one author.
            // We fallback to the owner user.
            if (targetProperty === 'authors' && !this.dataToImport[postIndex][targetProperty].length) {
                this.dataToImport[postIndex][targetProperty] = [{
                    id: ownerUserId
                }];
            }
        };

        _.each(this.dataToImport, (postToImport, postIndex) => {
            run(postToImport, postIndex, 'tags', 'tags');
            run(postToImport, postIndex, 'authors', 'users');
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
