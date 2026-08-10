const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const postsPublicService = require('../../services/posts-public');
const getPostServiceInstance = require('../../services/posts/posts-service-instance');
const postsService = getPostServiceInstance();
const {rejectContentApiRestrictedFieldsTransformer} = require('./utils/api-filter-utils');
const {generateGiftKeyData, applyGiftAccess} = require('./utils/gift-link-access');
const {generateOptionsData, generateAuthData} = require('./utils/public-cache-keys');

const ALLOWED_INCLUDES = ['tags', 'authors', 'tiers', 'sentiment'];

const messages = {
    postNotFound: 'Post not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'posts',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        cache: postsPublicService.api?.cache,
        generateCacheKeyData(frame) {
            return {
                options: generateOptionsData(frame, [
                    'include',
                    'filter',
                    'fields',
                    'formats',
                    'limit',
                    'order',
                    'page',
                    'absolute_urls',
                    'collection'
                ]),
                skipPagination: frame.options?.skipPagination === true,
                auth: generateAuthData(frame),
                method: 'browse'
            };
        },
        options: [
            'include',
            'filter',
            'fields',
            'formats',
            'limit',
            'order',
            'page',
            'debug',
            'absolute_urls',
            'collection',
            'skipPagination'
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
            return postsService.browsePosts(options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        cache: postsPublicService.api?.cache,
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
                    message: tpl(messages.postNotFound)
                });
            }

            await applyGiftAccess(frame, model);

            return model;
        }
    }
};

module.exports = controller;
