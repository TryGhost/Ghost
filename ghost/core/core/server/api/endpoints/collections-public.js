const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const collectionsService = require('../../services/collections');

const messages = {
    collectionNotFound: 'Collection not found.'
};

module.exports = {
    docName: 'collections',

    readBySlug: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'slug'
        ],
        permissions: true,
        async query(frame) {
            const model = await collectionsService.api.getBySlug(frame.data.slug);

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.collectionNotFound)
                });
            }

            return model;
        }
    },

    readById: {
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
    }
};
