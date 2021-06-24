// NOTE: We must not cache references to membersService.api
// as it is a getter and may change during runtime.
const errors = require('@tryghost/errors');
const membersService = require('../../services/members');

const i18n = require('../../../shared/i18n');

const allowedIncludes = ['stripe_prices', 'monthly_price', 'yearly_price', 'benefits'];

module.exports = {
    docName: 'products',

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
        permissions: true,
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
        permissions: true,
        async query(frame) {
            const model = await membersService.api.productRepository.get(frame.data, frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.products.productNotFound')
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
        permissions: false,
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
        headers: {},
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: false,
        async query(frame) {
            const model = await membersService.api.productRepository.update(
                frame.data,
                frame.options
            );

            if (model.wasChanged()) {
                this.headers.cacheInvalidate = true;
            } else {
                this.headers.cacheInvalidate = false;
            }
            return model;
        }
    }
};
