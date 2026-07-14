const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const {rejectContentApiRestrictedFieldsTransformer} = require('./utils/api-filter-utils');
const {generateGiftKeyData, applyGiftAccess} = require('./utils/gift-link-access');
const {generateOptionsData, generateAuthData} = require('./utils/public-cache-keys');

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
        // The pages read has no response cache today, but the key must stay
        // paired with applyGiftAccess below: if a cache is ever added without
        // the gift dimension, a gift read would populate the anonymous key
        // with unlocked content.
        async generateCacheKeyData(frame) {
            return {
                options: generateOptionsData(frame, [
                    'include',
                    'fields',
                    'formats',
                    'absolute_urls'
                ]),
                auth: generateAuthData(frame),
                gift: await generateGiftKeyData(frame),
                method: 'read',
                identifier: {
                    id: frame.data.id,
                    slug: frame.data.slug,
                    uuid: frame.data.uuid
                }
            };
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

            await applyGiftAccess(frame, model);

            return model;
        }
    }
};

module.exports = controller;
