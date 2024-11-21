// This is a new endpoint for the admin API to return replies to a comment with pagination

const commentsService = require('../../services/comments');

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
        query(frame) {
            return commentsService.controller.adminReplies(frame);
        }
    }
};

module.exports = controller;
