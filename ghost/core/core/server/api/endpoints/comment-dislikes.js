// Endpoint for the admin API to return dislikers for a comment

const commentsService = require('../../services/comments');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'comment_dislikes',
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
        // Use comment permissions - browsing dislikes is part of comment moderation
        permissions: {
            docName: 'comments'
        },
        query(frame) {
            return commentsService.controller.getCommentDislikes(frame);
        }
    }
};

module.exports = controller;
