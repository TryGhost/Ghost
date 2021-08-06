const models = require('../../models');
const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');
const getPostServiceInstance = require('../../services/posts/posts-service');
const ALLOWED_INCLUDES = ['tags', 'authors', 'authors.roles'];
const UNSAFE_ATTRS = ['status', 'authors', 'visibility'];

const postsService = getPostServiceInstance('canary');

module.exports = {
    docName: 'pages',
    browse: {
        options: [
            'include',
            'filter',
            'fields',
            'formats',
            'limit',
            'order',
            'page',
            'debug',
            'absolute_urls'
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
        permissions: {
            docName: 'posts',
            unsafeAttrs: UNSAFE_ATTRS
        },
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
            'absolute_urls',
            // NOTE: only for internal context
            'forUpdate',
            'transacting'
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
        permissions: {
            docName: 'posts',
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            return models.Post.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        throw new errors.NotFoundError({
                            message: i18n.t('errors.api.pages.pageNotFound')
                        });
                    }

                    return model;
                });
        }
    },

    add: {
        statusCode: 201,
        headers: {},
        options: [
            'include',
            'formats',
            'source'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                source: {
                    values: ['html']
                }
            }
        },
        permissions: {
            docName: 'posts',
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            return models.Post.add(frame.data.pages[0], frame.options)
                .then((model) => {
                    if (model.get('status') !== 'published') {
                        this.headers.cacheInvalidate = false;
                    } else {
                        this.headers.cacheInvalidate = true;
                    }

                    return model;
                });
        }
    },

    edit: {
        headers: {},
        options: [
            'include',
            'id',
            'formats',
            'source',
            'force_rerender',
            // NOTE: only for internal context
            'forUpdate',
            'transacting'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                id: {
                    required: true
                },
                source: {
                    values: ['html']
                }
            }
        },
        permissions: {
            docName: 'posts',
            unsafeAttrs: UNSAFE_ATTRS
        },
        async query(frame) {
            const model = await models.Post.edit(frame.data.pages[0], frame.options);

            this.headers.cacheInvalidate = postsService.handleCacheInvalidation(model);

            return model;
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'include',
            'id'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            frame.options.require = true;

            return models.Post.destroy(frame.options)
                .then(() => null)
                .catch(models.Post.NotFoundError, () => {
                    return Promise.reject(new errors.NotFoundError({
                        message: i18n.t('errors.api.pages.pageNotFound')
                    }));
                });
        }
    }
};
