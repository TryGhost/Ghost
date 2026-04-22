const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const {rejectContentApiRestrictedFieldsTransformer} = require('./utils/api-filter-utils');

const ALLOWED_INCLUDES = ['count.posts'];

const messages = {
    notFound: 'Author not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'authors',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'filter',
            'fields',
            'limit',
            'order',
            'page'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        query(frame) {
            const options = {
                ...frame.options,
                mongoTransformer: rejectContentApiRestrictedFieldsTransformer
            };
            return models.Author.findPage(options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'filter',
            'fields'
        ],
        data: [
            'id',
            'slug',
            'email',
            'role'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        async query(frame) {
            const options = {
                ...frame.options,
                mongoTransformer: rejectContentApiRestrictedFieldsTransformer
            };

            const model = await models.Author.findOne(frame.data, options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.notFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
