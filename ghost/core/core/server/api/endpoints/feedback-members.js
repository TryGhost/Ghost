const feedbackService = require('../../services/audience-feedback');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'feedback',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        options: [
            'limit',
            'page',
            'order',
            'score'
        ],
        validation: {
            data: {
                id: {
                    type: 'string',
                    required: true
                }
            }
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        query(frame) {
            return feedbackService.controller.browse(frame);
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        validation: {
            data: {
                post_id: {
                    required: true
                },
                score: {
                    required: true
                }
            }
        },
        permissions: false,
        query(frame) {
            return feedbackService.controller.add(frame);
        }
    }
};

module.exports = controller;
