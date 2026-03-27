// Endpoint for the admin API to return likers for a comment

const commentsService = require('../../services/comments');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'comment_likes',
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
        // Use comment permissions - browsing likes is part of comment moderation
        permissions: {
            docName: 'comments'
        },
        query(frame) {
            return commentsService.controller.getCommentLikes(frame);
        }
    }
};

module.exports = controller;
