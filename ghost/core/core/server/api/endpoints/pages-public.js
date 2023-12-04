const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {mapQuery} = require('@tryghost/mongo-utils');
const models = require('../../models');

const ALLOWED_INCLUDES = ['tags', 'authors', 'tiers'];

const messages = {
    pageNotFound: 'Page not found.'
};

const rejectPrivateFieldsTransformer = input => mapQuery(input, function (value, key) {
    let lowerCaseKey = key.toLowerCase();
    if (lowerCaseKey.startsWith('authors.password') || lowerCaseKey.startsWith('authors.email')) {
        return;
    }

    return {
        [key]: value
    };
});

module.exports = {
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
        query(frame) {
            const options = {
                ...frame.options,
                mongoTransformer: rejectPrivateFieldsTransformer
            };
            return models.Post.findOne(frame.data, options)
                .then((model) => {
                    if (!model) {
                        throw new errors.NotFoundError({
                            message: tpl(messages.pageNotFound)
                        });
                    }

                    return model;
                });
        }
    }
};
