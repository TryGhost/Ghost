const errors = require('@tryghost/errors');
const membersService = require('../../services/members');

const tpl = require('@tryghost/tpl');

const allowedIncludes = ['monthly_price', 'yearly_price', 'benefits'];

const messages = {
    productNotFound: 'Tier not found.'
};

module.exports = {
    docName: 'tiers',

    browse: {
        options: [
            'limit',
            'fields',
            'include',
            'filter',
            'order',
            'debug',
            'page'
        ],
        permissions: {
            docName: 'products'
        },
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        async query(frame) {
            const page = await membersService.api.productRepository.list(frame.options);

            return page;
        }
    },

    read: {
        options: [
            'include'
        ],
        headers: {},
        data: [
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
                }
            }
        },
        permissions: {
            docName: 'products'
        },
        async query(frame) {
            const model = await membersService.api.productRepository.get(frame.data, frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.productNotFound)
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
        validation: {
            data: {
                name: {required: true}
            }
        },
        permissions: {
            docName: 'products'
        },
        async query(frame) {
            const model = await membersService.api.productRepository.create(
                frame.data,
                frame.options
            );
            return model;
        }
    },

    edit: {
        statusCode: 200,
        options: [
            'id'
        ],
        headers: {
            cacheInvalidate: true
        },
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'products'
        },
        async query(frame) {
            const model = await membersService.api.productRepository.update(
                frame.data,
                frame.options
            );

            return model;
        }
    }
};
