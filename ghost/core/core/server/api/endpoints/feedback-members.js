const feedbackService = require('../../services/audience-feedback');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'feedback',

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
