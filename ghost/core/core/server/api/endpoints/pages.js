const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const getPostServiceInstance = require('../../services/posts/posts-service-instance');
const ALLOWED_INCLUDES = ['tags', 'authors', 'authors.roles', 'tiers', 'count.signups', 'count.paid_conversions', 'post_revisions', 'post_revisions.author'];
const UNSAFE_ATTRS = ['status', 'authors', 'visibility'];

const messages = {
    pageNotFound: 'Page not found.'
};

const postsService = getPostServiceInstance();

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
        headers: {
            cacheInvalidate: false
        },
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
        async query(frame) {
            const model = await models.Post.findOne(frame.data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.pageNotFound)
                });
            }

            return model;
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
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
        async query(frame) {
            const model = await models.Post.add(frame.data.pages[0], frame.options);
            if (model.get('status') === 'published') {
                frame.setHeader('X-Cache-Invalidate', '/*');
            }

            return model;
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'id',
            'formats',
            'source',
            'force_rerender',
            'save_revision',
            'convert_to_lexical',
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

            const cacheInvalidation = postsService.handleCacheInvalidation(model);

            if (cacheInvalidation === true) {
                frame.setHeader('X-Cache-Invalidate', '/*');
            } else if (cacheInvalidation.value) {
                frame.setHeader('X-Cache-Invalidate', cacheInvalidation.value);
            }

            return model;
        }
    },

    bulkEdit: {
        statusCode: 200,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'filter'
        ],
        data: [
            'action',
            'meta'
        ],
        validation: {
            data: {
                action: {
                    required: true
                }
            },
            options: {
                filter: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            method: 'edit'
        },
        async query(frame) {
            return await postsService.bulkEdit(frame.data.bulk, frame.options);
        }
    },

    bulkDestroy: {
        statusCode: 200,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'filter'
        ],
        permissions: {
            docName: 'posts',
            method: 'destroy'
        },
        async query(frame) {
            return await postsService.bulkDestroy(frame.options);
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
            return models.Post.destroy({...frame.options, require: true});
        }
    },

    copy: {
        statusCode: 201,
        headers: {
            location: {
                resolve: postsService.generateCopiedPostLocationFromUrl
            },
            cacheInvalidate: false
        },
        options: [
            'id',
            'formats'
        ],
        validation: {
            id: {
                required: true
            }
        },
        permissions: {
            docName: 'posts',
            method: 'add'
        },
        async query(frame) {
            return postsService.copyPost(frame);
        }
    }
};

module.exports = controller;
