// This is a new endpoint for the admin API to return replies to a comment with pagination

const commentsService = require('../../services/comments');
const ALLOWED_INCLUDES = ['member', 'replies', 'replies.member', 'replies.count.likes', 'replies.liked', 'count.replies', 'count.likes', 'liked', 'post', 'parent'];

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
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
            'debug',
            'id',
            'impersonate_member_uuid'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return commentsService.controller.adminReplies(frame);
        }
    },
    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'impersonate_member_uuid'
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
            frame.options.isAdmin = true;
            return commentsService.controller.read(frame);
        }
    }
};

module.exports = controller;
