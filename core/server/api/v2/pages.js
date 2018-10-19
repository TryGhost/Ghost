const common = require('../../lib/common');
const models = require('../../models');
const ALLOWED_INCLUDES = ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'authors', 'authors.roles'];

module.exports = {
    docName: 'pages',
    browse: {
        options: [
            'include',
            'filter',
            'status',
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
            'status',
            'formats',
            'debug'
        ],
        data: [
            'id',
            'slug',
            'status',
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
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.pages.pageNotFound')
                        });
                    }

                    return model;
                });
        }
    }
};
