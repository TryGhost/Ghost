const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const collectionsService = require('../../services/collections');

const messages = {
    collectionNotFound: 'Collection not found.'
};

module.exports = {
    docName: 'collections',

    browse: {
        options: [
            'limit',
            'order',
            'page'
        ],
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        query(frame) {
            return collectionsService.api.browse(frame.options);
        }
    },

    read: {
        data: [
            'id'
        ],
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        async query(frame) {
            const model = await collectionsService.api.read(frame.data.id, frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.collectionNotFound)
                });
            }

            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        async query(frame) {
            return await collectionsService.api.add(frame.data.collections[0], frame.options);
        }
    },

    edit: {
        headers: {},
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        async query(frame) {
            const model = await collectionsService.api.edit(Object.assign(frame.data.collections[0], {
                id: frame.options.id
            }), frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.collectionNotFound)
                });
            }

            // @NOTE: cache invalidation has to be done manually for now
            //        because the model's wasChanged is not returned from
            //        the service using in-memory repository layer
            // if (model.wasChanged()) {
            this.headers.cacheInvalidate = true;
            // } else {
            //     this.headers.cacheInvalidate = false;
            // }

            return model;
        }
    },

    addPost: {
        docName: 'collection_posts',
        statusCode: 200,
        headers: {},
        options: [
            'id'
        ],
        data: [
            'post_id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            },
            data: {
                post_id: {
                    required: true
                }
            }
        },
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        async query(frame) {
            const collectionPost = await collectionsService.api.addPost(frame.options.id, {
                id: frame.data.posts[0].id
            });

            if (!collectionPost) {
                throw new errors.NotFoundError({
                    message: tpl(messages.collectionNotFound)
                });
            }

            return collectionPost;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        async query(frame) {
            return await collectionsService.api.destroy(frame.options.id);
        }
    },

    destroyPost: {
        docName: 'collection_posts',
        statusCode: 200,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id',
            'post_id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                },
                post_id: {
                    required: true
                }
            }
        },
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        async query(frame) {
            const collection = await collectionsService.api.destroyCollectionPost(frame.options.id, frame.options.post_id);

            if (!collection) {
                throw new errors.NotFoundError({
                    message: tpl(messages.collectionNotFound)
                });
            }

            return collection;
        }
    }
};
