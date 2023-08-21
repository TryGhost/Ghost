const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {mapQuery} = require('@tryghost/mongo-utils');
const postsPublicService = require('../../services/posts-public');
const getPostServiceInstance = require('../../services/posts/posts-service');
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

module.exports = {
    docName: 'posts',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        cache: postsPublicService.api?.cache,
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
        query(frame) {
            const options = {
                ...frame.options,
                mongoTransformer: rejectPrivateFieldsTransformer
            };
            return models.Post.findOne(frame.data, options)
                .then((model) => {
                    if (!model) {
                        throw new errors.NotFoundError({
                            message: tpl(messages.postNotFound)
                        });
                    }

                    return model;
                });
        }
    }
};
