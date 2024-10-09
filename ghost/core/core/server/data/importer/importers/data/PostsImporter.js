const debug = require('@tryghost/debug')('importer:posts');
const _ = require('lodash');
const crypto = require('crypto');
const BaseImporter = require('./Base');
const mobiledocLib = require('../../../../lib/mobiledoc');
const validator = require('@tryghost/validator');
const postsMetaSchema = require('../../../schema').tables.posts_meta;
const metaAttrs = _.keys(_.omit(postsMetaSchema, ['id']));

class PostsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Post',
            dataKeyToImport: 'posts',
            requiredFromFile: [
                'posts',
                'tags',
                'posts_tags',
                'posts_authors',
                'posts_meta',
                'products',
                'posts_products'
            ],
            requiredImportedData: ['tags', 'products', 'newsletters'],
            requiredExistingData: ['tags', 'products', 'newsletters']
        });
    }

    sanitizeAttributes() {
        _.each(this.dataToImport, (obj) => {
            if (!validator.isUUID(obj.uuid || '')) {
                obj.uuid = crypto.randomUUID();
            }

            // we used to have post.page=true/false
            // we now have post.type='page'/'post'
            // give precedence to post.type if both are present
            if (_.has(obj, 'page')) {
                if (_.isEmpty(obj.type)) {
                    obj.type = obj.page ? 'page' : 'post';
                }
                delete obj.page;
            }

            if (_.has(obj, 'send_email_when_published')) {
                if (obj.send_email_when_published) {
                    obj.email_recipient_filter = obj.visibility === 'paid' ? 'status:-free' : 'all';
                    // @TODO: we need to set the newsletter_id to the default newsletter here to have a proper fallback for older imports
                }
                delete obj.send_email_when_published;
            }
        });
    }

    /**
     * Sanitizes post metadata, picking data from sepearate table(for >= v3) or post itself(for < v3)
     */
    sanitizePostsMeta(model) {
        let postsMetaFromFile = _.find(this.requiredFromFile.posts_meta, {post_id: model.id}) || _.pick(model, metaAttrs);
        let postsMetaData = Object.assign({}, _.mapValues(postsMetaSchema, (value) => {
            return Reflect.has(value, 'defaultTo') ? value.defaultTo : null;
        }), postsMetaFromFile);
        model.posts_meta = postsMetaData;
        _.each(metaAttrs, (attr) => {
            delete model[attr];
        });
    }

    /**
     * Naive function to attach related tags, authors, and products.
     */
    addNestedRelations() {
        this.requiredFromFile.posts_tags = _.orderBy(this.requiredFromFile.posts_tags, ['post_id', 'sort_order'], ['asc', 'asc']);
        this.requiredFromFile.posts_authors = _.orderBy(this.requiredFromFile.posts_authors, ['post_id', 'sort_order'], ['asc', 'asc']);
        this.requiredFromFile.posts_products = _.orderBy(this.requiredFromFile.posts_products, ['post_id', 'sort_order'], ['asc', 'asc']);

        /**
         * from {post_id: 1, tag_id: 2} to post.tags=[{id:id}]
         * from {post_id: 1, author_id: 2} post.authors=[{id:id}]
         * from {post_id: 1, product_id: 2} post.products=[{id:id}]
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
        run(this.requiredFromFile.posts_products, 'tiers', 'product_id');
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
                let importedObject = null;

                if (objectInFile.id) {
                    importedObject = _.find(this.requiredImportedData[tableName], {originalId: objectInFile.id});
                }

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
            run(postToImport, postIndex, 'tiers', 'products');
        });

        // map newsletter_id -> newsletters.id
        _.each(this.dataToImport, (objectInFile) => {
            if (!objectInFile.newsletter_id) {
                return;
            }
            const importedObject = _.find(this.requiredImportedData.newsletters, {originalId: objectInFile.newsletter_id});
            // CASE: we've imported the newsletter
            if (importedObject) {
                debug(`replaced newsletter_id ${objectInFile.newsletter_id} with ${importedObject.id}`);
                objectInFile.newsletter_id = importedObject.id;
                return;
            }
            const existingObject = _.find(this.requiredExistingData.newsletters, {id: objectInFile.newsletter_id});
            // CASE: newsletter already exists in the db
            if (existingObject) {
                return;
            }
            // CASE: newsletter doesn't exist; ignore it
            debug(`newsletter ${objectInFile.newsletter_id} not found; ignoring`);
            delete objectInFile.newsletter_id;
        });

        return super.replaceIdentifiers();
    }

    beforeImport() {
        debug('beforeImport');

        this.sanitizeAttributes();
        this.addNestedRelations();

        _.each(this.dataToImport, (model) => {
            // NOTE: we remember the original post id for disqus
            // (see https://github.com/TryGhost/Ghost/issues/8963)

            // CASE 1: you import a 1.0 export (amp field contains the correct disqus id)
            // CASE 2: you import a 2.0 export (we have to ensure we use the original post id as disqus id)
            if (model.id && model.amp) {
                model.comment_id = model.amp;
                delete model.amp;
            } else {
                if (!model.comment_id) {
                    model.comment_id = model.id;
                }
            }

            // CASE 1: you are importing old editor posts
            // CASE 2: you are importing Koenig Beta posts
            // CASE 3: you are importing Koenig 2.0 posts
            if (model.mobiledoc && !model.lexical) {
                let mobiledoc;

                try {
                    mobiledoc = JSON.parse(model.mobiledoc);

                    if (!mobiledoc.cards || !_.isArray(mobiledoc.cards)) {
                        model.mobiledoc = mobiledocLib.blankDocument;
                        mobiledoc = model.mobiledoc;
                    }
                } catch (err) {
                    mobiledoc = mobiledocLib.blankDocument;
                }

                // ghostVersion was introduced in 4.0. Any earlier content won't have it set
                // so we should set it to "3.0" to match rendering output
                if (!mobiledoc.ghostVersion) {
                    mobiledoc.ghostVersion = '3.0';
                }

                mobiledoc.cards.forEach((card) => {
                    // Ghost 1.0 markdown card = 'card-markdown', Ghost 2.0 markdown card = 'markdown'
                    if (card[0] === 'card-markdown') {
                        card[0] = 'markdown';
                    }

                    // Koenig Beta = imageStyle, Ghost 2.0 Koenig = cardWidth
                    if (card[0] === 'image' && card[1].imageStyle) {
                        card[1].cardWidth = card[1].imageStyle;
                        delete card[1].imageStyle;
                    }
                });

                model.mobiledoc = JSON.stringify(mobiledoc);
                model.html = mobiledocLib.render(JSON.parse(model.mobiledoc));
            } else if (model.html && !model.lexical) {
                model.mobiledoc = JSON.stringify(mobiledocLib.htmlToMobiledocConverter(model.html));
                model.html = mobiledocLib.render(JSON.parse(model.mobiledoc));
            }

            this.sanitizePostsMeta(model);
        });

        // NOTE: We only support removing duplicate posts within the file to import.
        // For any further future duplication detection, see https://github.com/TryGhost/Ghost/issues/8717.
        let slugs = [];
        this.dataToImport = _.filter(this.dataToImport, (post) => {
            if (!!post.slug && slugs.indexOf(post.slug) !== -1) {
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
