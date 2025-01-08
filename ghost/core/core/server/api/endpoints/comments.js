const models = require('../../models');
const commentsService = require('../../services/comments');
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
    }
};

module.exports = controller;
