const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const {rejectContentApiRestrictedFieldsTransformer} = require('./utils/api-filter-utils');

const ALLOWED_INCLUDES = ['tags', 'authors', 'tiers'];

const messages = {
    pageNotFound: 'Page not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'pages',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'filter',
            'fields',
            'formats',
            'absolute_urls',
            'page',
            'limit',
            'order',
            'debug'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: true,
        query(frame) {
            const options = {
                ...frame.options,
                mongoTransformer: rejectContentApiRestrictedFieldsTransformer
            };
            return models.Post.findPage(options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'fields',
            'formats',
            'debug',
            'absolute_urls'
        ],
        data: [
            'id',
            'slug',
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: true,
        async query(frame) {
            const options = {
                ...frame.options,
                mongoTransformer: rejectContentApiRestrictedFieldsTransformer
            };
            const model = await models.Post.findOne(frame.data, options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.pageNotFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
