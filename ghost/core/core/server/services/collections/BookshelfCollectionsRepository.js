const logger = require('@tryghost/logging');
const Collection = require('@tryghost/collections').Collection;
const sentry = require('../../../shared/sentry');
const {default: ObjectID} = require('bson-objectid');
/**
 * @typedef {import('@tryghost/collections/src/CollectionRepository')} CollectionRepository
 */

/**
 * @implements {CollectionRepository}
 */
module.exports = class BookshelfCollectionsRepository {
    #model;
    #relationModel;
    constructor(model, relationModel) {
        this.#model = model;
        this.#relationModel = relationModel;
    }

    async createTransaction(cb) {
        return this.#model.transaction(cb);
    }

    /**
     * @param {string} id
     * @returns {Promise<Collection>}
     */
    async getById(id, options = {}) {
        const model = await this.#model.findOne({id}, {
            require: false,
            withRelated: ['collectionPosts'],
            transacting: options.transaction
        });
        if (!model) {
            return null;
        }
        return this.#modelToCollection(model);
    }

    /**
     * @param {string} slug
     * @returns {Promise<Collection>}
     */
    async getBySlug(slug, options = {}) {
        const model = await this.#model.findOne({slug}, {
            require: false,
            withRelated: ['collectionPosts'],
            transacting: options.transaction
        });
        if (!model) {
            return null;
        }
        return this.#modelToCollection(model);
    }

    /**
     * NOTE: we are only fetching post_id column here to save memory on
     *       instances with a large amount of posts
     *
     *       The method could be further optimized to fetch posts for
     *       multiple collections at a time.
     *
     * @param {string} collectionId collection to fetch post ids for
     * @param {Object} options bookshelf options
     *
     * @returns {Promise<Array<{post_id: string}>>}
     */
    async #fetchCollectionPostIds(collectionId, options = {}) {
        if (!options.transaction) {
            return this.createTransaction((transaction) => {
                return this.#fetchCollectionPostIds(collectionId, {
                    ...options,
                    transaction
                });
            });
        }

        return await this.#relationModel
            .query()
            .select('post_id')
            .where('collection_id', collectionId)
            .transacting(options.transaction);
    }

    /**
     * @param {object} [options]
     * @param {string} [options.filter]
     * @param {string} [options.order]
     * @param {import('knex').Transaction} [options.transaction]
     */
    async getAll(options = {}) {
        const models = await this.#model.findAll({
            ...options,
            transacting: options.transaction
        });

        for (const model of models) {
            // NOTE: Ideally collection posts would be fetching as a part of findAll query.
            //       Because bookshelf introduced a massive processing and memory overhead
            //       we are fetching collection post ids separately using raw knex query
            model.collectionPostIds = await this.#fetchCollectionPostIds(model.id, options);
        }

        return (await Promise.all(models.map(model => this.#modelToCollection(model)))).filter(entity => !!entity);
    }

    async #modelToCollection(model) {
        const json = model.toJSON();
        let filter = json.filter;

        if (json.type === 'automatic' && typeof filter !== 'string') {
            filter = '';
        }

        try {
            // NOTE: collectionPostIds are not a part of serialized model
            //       and are fetched separately to save memory
            const posts = json.collectionPosts || model.collectionPostIds;

            return await Collection.create({
                id: json.id,
                slug: json.slug,
                title: json.title,
                description: json.description,
                filter: filter,
                type: json.type,
                featureImage: json.feature_image,
                posts: posts.map(collectionPost => collectionPost.post_id),
                createdAt: json.created_at,
                updatedAt: json.updated_at
            });
        } catch (err) {
            logger.error(err);
            sentry.captureException(err);
            return null;
        }
    }

    /**
     * @param {Collection} collection
     * @param {object} [options]
     * @param {import('knex').Transaction} [options.transaction]
     * @returns {Promise<void>}
     */
    async save(collection, options = {}) {
        if (!options.transaction) {
            return this.createTransaction((transaction) => {
                return this.save(collection, {
                    ...options,
                    transaction
                });
            });
        }

        if (collection.deleted) {
            await this.#relationModel.query().delete().where('collection_id', collection.id).transacting(options.transaction);
            await this.#model.query().delete().where('id', collection.id).transacting(options.transaction);
            return;
        }

        const data = {
            id: collection.id,
            slug: collection.slug,
            title: collection.title,
            description: collection.description,
            filter: collection.filter,
            type: collection.type,
            feature_image: collection.featureImage || null,
            created_at: collection.createdAt,
            updated_at: collection.updatedAt
        };

        const existing = await this.#model.findOne(
            {id: data.id},
            {
                require: false,
                transacting: options.transaction,
                withRelated: ['collectionPosts']
            }
        );

        if (!existing) {
            await this.#model.add(data, {
                transacting: options.transaction
            });
            const collectionPostsRelations = collection.posts.map((postId, index) => {
                return {
                    id: (new ObjectID).toHexString(),
                    sort_order: collection.type === 'manual' ? index : 0,
                    collection_id: collection.id,
                    post_id: postId
                };
            });
            if (collectionPostsRelations.length > 0) {
                await this.#relationModel.query().insert(collectionPostsRelations).transacting(options.transaction);
            }
        } else {
            await this.#model.edit(data, {
                id: data.id,
                transacting: options.transaction
            });

            const collectionPostsRelations = collection.posts.map((postId, index) => {
                return {
                    id: (new ObjectID).toHexString(),
                    sort_order: collection.type === 'manual' ? index : 0,
                    collection_id: collection.id,
                    post_id: postId
                };
            });

            const collectionPostRelationsToDeleteIds = [];

            if (collection.type === 'manual') {
                await this.#relationModel.query().delete().where('collection_id', collection.id).transacting(options.transaction);
            } else {
                const existingRelations = existing.toJSON().collectionPosts;

                for (const existingRelation of existingRelations) {
                    const found = collectionPostsRelations.find((thing) => {
                        return thing.post_id === existingRelation.post_id;
                    });
                    if (found) {
                        found.id = null;
                    } else {
                        collectionPostRelationsToDeleteIds.push(existingRelation.id);
                    }
                }
            }

            const missingCollectionPostsRelations = collectionPostsRelations.filter(thing => thing.id !== null);

            if (missingCollectionPostsRelations.length > 0) {
                await this.#relationModel.query().insert(missingCollectionPostsRelations).transacting(options.transaction);
            }
            if (collectionPostRelationsToDeleteIds.length > 0) {
                await this.#relationModel.query().delete().whereIn('id', collectionPostRelationsToDeleteIds).transacting(options.transaction);
            }
        }
    }
};
