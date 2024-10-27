const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const collectionsService = require('../../services/collections');

const messages = {
    collectionNotFound: 'Collection not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'collections',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'order',
            'page',
            'filter',
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: ['count.posts']
                }
            }
        },
        permissions: true,
        query(frame) {
            return collectionsService.api.getAll({
                filter: frame.options.filter,
                limit: frame.options.limit,
                page: frame.options.page
            });
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include'
        ],
        data: [
            'id',
            'slug'
        ],
        validation: {
            options: {
                include: {
                    values: ['count.posts']
                }
            }
        },
        permissions: true,
        async query(frame) {
            let model;
            if (frame.data.id) {
                model = await collectionsService.api.getById(frame.data.id);
            } else {
                model = await collectionsService.api.getBySlug(frame.data.slug);
            }

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
            const model = await collectionsService.api.edit(Object.assign(frame.data.collections[0], {
                id: frame.options.id
            }));

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.collectionNotFound)
                });
            }

            return model;
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
    }
};

module.exports = controller;
