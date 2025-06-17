const models = require('../../models');
const commentsService = require('../../services/comments');
const errors = require('@tryghost/errors');
function handleCacheHeaders(model, frame) {
    if (model) {
        const postId = model.get('post_id');
        const parentId = model.get('parent_id');
        const pathsToInvalidate = [
            postId ? `/api/members/comments/post/${postId}/` : null,
            parentId ? `/api/members/comments/${parentId}/replies/` : null
        ].filter(path => path !== null);
        frame.setHeader('X-Cache-Invalidate', pathsToInvalidate.join(', '));
    }
}

function validateCommentData(data) {
    if (!data.post_id && !data.parent_id) {
        throw new errors.ValidationError({
            message: 'Either post_id (for top-level comments) or parent_id (for replies) must be provided'
        });
    }
}

function setupMemberContext(frame, memberId) {
    if (!frame.options.context) {
        frame.options.context = {};
    }
    if (!frame.options.context.member) {
        frame.options.context.member = {};
    }
    frame.options.context.member.id = memberId;
    frame.options.context.internal = true;
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
            const result = await models.Comment.edit({
                id: frame.data.comments[0].id,
                status: frame.data.comments[0].status
            }, frame.options);

            handleCacheHeaders(result, frame);

            return result;
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
            const result = await commentsService.controller.adminBrowse(frame);
            return result;
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
            setupMemberContext(frame, data.member_id);
            
            const result = await commentsService.controller.add(frame);
            handleCacheHeaders(result, frame);
            
            return result;
        }
    }
};

module.exports = controller;
