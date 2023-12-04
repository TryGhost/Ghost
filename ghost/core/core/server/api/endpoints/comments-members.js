const commentsService = require('../../services/comments');
const ALLOWED_INCLUDES = ['member', 'replies', 'replies.member', 'replies.count.likes', 'replies.liked', 'count.replies', 'count.likes', 'liked', 'post', 'parent'];
const UNSAFE_ATTRS = ['status'];

module.exports = {
    docName: 'comments',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'page',
            'limit',
            'fields',
            'filter',
            'order',
            'debug'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            return commentsService.controller.browse(frame);
        }
    },

    replies: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'page',
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'id'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: 'browse',
        query(frame) {
            return commentsService.controller.replies(frame);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include'
        ],
        data: [
            'id',
            'email'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            return commentsService.controller.read(frame);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id',
            'include'
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
        permissions: true,
        query(frame) {
            return commentsService.controller.edit(frame);
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include'

        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            },
            data: {
                post_id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: UNSAFE_ATTRS
        },
        query(frame) {
            return commentsService.controller.add(frame);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'id'
        ],
        validation: {
            options: {
                include: ALLOWED_INCLUDES
            }
        },
        permissions: true,
        query(frame) {
            return commentsService.controller.destroy(frame);
        }
    },

    counts: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        options: [
            'ids'
        ],
        async query(frame) {
            return commentsService.controller.count(frame);
        }
    },

    like: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
        },
        permissions: true,
        async query(frame) {
            return await commentsService.controller.like(frame);
        }
    },

    unlike: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {},
        permissions: true,
        async query(frame) {
            return await commentsService.controller.unlike(frame);
        }
    },

    report: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {},
        permissions: true,
        async query(frame) {
            await commentsService.controller.report(frame);
        }
    }
};
