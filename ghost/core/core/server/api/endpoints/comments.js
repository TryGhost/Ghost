const commentsService = require('../../services/comments');
const errors = require('@tryghost/errors');

function validateCommentData(data) {
    if (!data.post_id && !data.parent_id) {
        throw new errors.ValidationError({
            message: 'Either post_id (for top-level comments) or parent_id (for replies) must be provided'
        });
    }
}

function validateCreatedAt(createdAt) {
    if (!createdAt) {
        return undefined;
    }
    
    // Only accept string or Date objects, reject other types like numbers
    if (typeof createdAt !== 'string' && !(createdAt instanceof Date)) {
        return undefined;
    }
    
    const date = new Date(createdAt);
    // Check if the date is valid and not in the future
    if (!isNaN(date.getTime()) && date <= new Date()) {
        return date;
    }
    
    return undefined;
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'comments',

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            return await commentsService.controller.adminEdit(frame);
        }
    },
    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'post_id',
            'include',
            'page',
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'impersonate_member_uuid'
        ],
        validation: {
            options: {
                post_id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            return await commentsService.controller.adminBrowse(frame);
        }
    },
    browseAll: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'page',
            'limit',
            'filter',
            'order',
            'include_nested'
        ],
        validation: {},
        permissions: {
            method: 'browse'
        },
        async query(frame) {
            return await commentsService.controller.adminBrowseAll(frame);
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
                include: {
                    values: ['post', 'member', 'replies', 'replies.member']
                }
            },
            data: {
                member_id: {
                    required: true
                },
                html: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const data = frame.data.comments[0];
            
            validateCommentData(data);
            const validatedCreatedAt = validateCreatedAt(data.created_at);
            
            // Set internal context to prevent notifications
            if (!frame.options.context) {
                frame.options.context = {};
            }
            frame.options.context.internal = true;
            
            const result = data.parent_id
                ? await commentsService.api.replyToComment(
                    data.parent_id,
                    data.in_reply_to_id,
                    data.member_id,
                    data.html,
                    frame.options,
                    validatedCreatedAt
                )
                : await commentsService.api.commentOnPost(
                    data.post_id,
                    data.member_id,
                    data.html,
                    frame.options,
                    validatedCreatedAt
                );
            
            commentsService.controller.setCacheInvalidationHeaders(result, frame);
            
            return result;
        }
    }
};

module.exports = controller;
