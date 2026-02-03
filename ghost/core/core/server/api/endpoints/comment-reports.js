// Endpoint for the admin API to return reporters for a comment

const commentsService = require('../../services/comments');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'comment_reports',
    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id',
            'page',
            'limit'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        // Use comment permissions - browsing reports is part of comment moderation
        permissions: {
            docName: 'comments'
        },
        query(frame) {
            return commentsService.controller.getCommentReporters(frame);
        }
    }
};

module.exports = controller;
