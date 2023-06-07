const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const collectionsService = require('../../services/collections');

const messages = {
    collectionNotFound: 'Collection not found.'
};

module.exports = {
    docName: 'collections',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'order',
            'page',
            'filter'
        ],
        permissions: true,
        query(frame) {
            return collectionsService.api.getAll(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            const model = await collectionsService.api.getById(frame.data.id);

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
        permissions: true,
        async query(frame) {
            return await collectionsService.api.createCollection(frame.data.collections[0]);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
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
        permissions: true,
        async query(frame) {
            const model = await collectionsService.api.edit(Object.assign(frame.data.collections[0], {
                id: frame.options.id
            }));

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
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
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
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const collectionPost = await collectionsService.api.addPostToCollection(frame.options.id, {
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
        permissions: true,
        async query(frame) {
            return await collectionsService.api.destroy(frame.options.id);
        }
    },

    destroyPost: {
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
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const collection = await collectionsService.api.removePostFromCollection(frame.options.id, frame.options.post_id);

            if (!collection) {
                throw new errors.NotFoundError({
                    message: tpl(messages.collectionNotFound)
                });
            }

            return collection;
        }
    }
};
