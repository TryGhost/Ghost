const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ALLOWED_INCLUDES = ['tags', 'authors'];

const messages = {
    pageNotFound: 'Page not found.'
};

module.exports = {
    docName: 'pages',

    browse: {
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
            return models.Post.findPage(frame.options);
        }
    },

    read: {
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
            return models.Post.findOne(frame.data, frame.options)
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
