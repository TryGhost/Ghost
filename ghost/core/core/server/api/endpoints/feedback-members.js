const feedbackService = require('../../services/audience-feedback');

module.exports = {
    docName: 'feedback',

    add: {
        statusCode: 201,
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
