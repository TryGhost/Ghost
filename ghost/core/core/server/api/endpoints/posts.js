const urlUtils = require('../../../shared/url-utils');
const models = require('../../models');
const getPostServiceInstance = require('../../services/posts/posts-service');
const allowedIncludes = [
    'tags',
    'authors',
    'authors.roles',
    'email',
    'tiers',
    'newsletter',
    'count.conversions',
    'count.signups',
    'count.paid_conversions',
    'count.clicks',
    'sentiment',
    'count.positive_feedback',
    'count.negative_feedback',
    'post_revisions',
    'post_revisions.author'
];
const unsafeAttrs = ['status', 'authors', 'visibility'];

const postsService = getPostServiceInstance();

/**
 * @param {string} event
 */
function getCacheHeaderFromEventString(event, dto) {
    if (event === 'published_updated' || event === 'unpublished') {
        return true;
    }
    if (event === 'scheduled_updated' || event === 'draft_updated') {
        const baseUrl = urlUtils.urlFor({
            relativeUrl: urlUtils.urlJoin('/p', dto.uuid, '/')
        });
        return {
            value: [
                baseUrl,
                `${baseUrl}?member_status=anonymous`,
                `${baseUrl}?member_status=free`,
                `${baseUrl}?member_status=paid`
            ].join(', ')
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
        options: [
            'include',
            'filter',
            'fields',
            'collection',
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
                    values: allowedIncludes
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return postsService.browsePosts(frame.options);
        }
    },

    exportCSV: {
        options: [
            'limit',
            'filter',
            'order'
        ],
        headers: {
            disposition: {
                type: 'csv',
                value() {
                    const datetime = (new Date()).toJSON().substring(0, 10);
                    return `post-analytics.${datetime}.csv`;
                }
            },
            cacheInvalidate: false
        },
        response: {
            format: 'plain'
        },
        permissions: {
            method: 'browse'
        },
        validation: {},
        async query(frame) {
            return {
                data: await postsService.export(frame)
            };
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
                    values: allowedIncludes
                },
                formats: {
                    values: models.Post.allowedFormats
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return postsService.readPost(frame);
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
                    values: allowedIncludes
                },
                source: {
                    values: ['html']
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
        },
        query(frame) {
            return models.Post.add(frame.data.posts[0], frame.options)
                .then((model) => {
                    if (model.get('status') === 'published') {
                        frame.setHeader('X-Cache-Invalidate', '/*');
                    }

                    return model;
                });
        }
    },

    edit: {
        headers: {
            /** @type {boolean | {value: string}} */
            cacheInvalidate: false
        },
        options: [
            'include',
            'id',
            'formats',
            'source',
            'email_segment',
            'newsletter',
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
                    values: allowedIncludes
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
            unsafeAttrs: unsafeAttrs
        },
        async query(frame) {
            let model = await postsService.editPost(frame, {
                eventHandler: (event, dto) => {
                    const cacheInvalidate = getCacheHeaderFromEventString(event, dto);
                    if (cacheInvalidate === true) {
                        frame.setHeader('X-Cache-Invalidate', '/*');
                    } else if (cacheInvalidate?.value) {
                        frame.setHeader('X-Cache-Invalidate', cacheInvalidate.value);
                    }
                }
            });

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
                    values: allowedIncludes
                },
                id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: unsafeAttrs
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
            method: 'add'
        },
        async query(frame) {
            return postsService.copyPost(frame);
        }
    }
};

module.exports = controller;
