const {mapQuery} = require('@tryghost/mongo-utils');
const models = require('../../models');
const getPostServiceInstance = require('../../services/posts/posts-service');
const postsService = getPostServiceInstance();

const ALLOWED_INCLUDES = ['tags', 'authors', 'tiers'];

const rejectPrivateFieldsTransformer = input => mapQuery(input, function (value, key) {
    let lowerCaseKey = key.toLowerCase();
    if (lowerCaseKey.startsWith('authors.password') || lowerCaseKey.startsWith('authors.email')) {
        return;
    }

    return {
        [key]: value
    };
});

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
                mongoTransformer: rejectPrivateFieldsTransformer
            };

            return postsService.browsePosts({...frame, options});
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
        query(frame) {
            const options = {
                ...frame.options,
                mongoTransformer: rejectPrivateFieldsTransformer
            };
            return postsService.readPost({...frame, options});
        }
    }
};

module.exports = controller;
