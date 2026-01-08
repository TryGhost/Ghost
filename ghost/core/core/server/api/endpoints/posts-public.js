const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {mapQuery} = require('@tryghost/mongo-utils');
const postsPublicService = require('../../services/posts-public');
const getPostServiceInstance = require('../../services/posts/posts-service-instance');
const postsService = getPostServiceInstance();

const allowedIncludes = ['tags', 'authors', 'tiers', 'sentiment'];

const messages = {
    postNotFound: 'Post not found.'
};

const rejectPrivateFieldsTransformer = input => mapQuery(input, function (value, key) {
    const lowerCaseKey = key.toLowerCase();
    if (lowerCaseKey.startsWith('authors.password') || lowerCaseKey.startsWith('authors.email')) {
        return;
    }

    return {
        [key]: value
    };
});

/**
 *
 * @param {import('@tryghost/api-framework').Frame} frame
 * @param {object} options
 * @returns {object}
 */
function generateOptionsData(frame, options) {
    return options.reduce((memo, option) => {
        let value = frame.options?.[option];

        if (['include', 'fields', 'formats'].includes(option) && typeof value === 'string') {
            value = value.split(',').sort();
        }

        if (option === 'page') {
            value = value || 1;
        }

        return {
            ...memo,
            [option]: value
        };
    }, {});
}

function generateAuthData(frame) {
    if (frame.options?.context?.member) {
        return {
            free: frame.options?.context?.member.status === 'free',
            tiers: frame.options?.context?.member.products?.map((product) => {
                return product.slug;
            }).sort()
        };
    }
}

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
            'collection'
        ],
        validation: {
            options: {
                include: {
                    values: allowedIncludes
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
                mongoTransformer: rejectPrivateFieldsTransformer
            };
            return postsService.browsePosts(options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        cache: postsPublicService.api?.cache,
        generateCacheKeyData(frame) {
            return {
                options: generateOptionsData(frame, [
                    'include',
                    'fields',
                    'formats',
                    'absolute_urls'
                ]),
                auth: generateAuthData(frame),
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
                    values: allowedIncludes
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
                mongoTransformer: rejectPrivateFieldsTransformer
            };
            const model = await models.Post.findOne(frame.data, options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.postNotFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
