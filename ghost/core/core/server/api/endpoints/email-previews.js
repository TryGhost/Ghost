const emailService = require('../../services/email-service');

module.exports = {
    docName: 'email_previews',

    read: {
        options: [
            'fields',
            'memberSegment',
            'newsletter'
        ],
        validation: {
            options: {
                fields: ['html', 'plaintext', 'subject']
            }
        },
        data: [
            'id',
            'status'
        ],
        permissions: true,
        async query(frame) {
            return await emailService.controller.previewEmail(frame);
        }
    },
    sendTestEmail: {
        statusCode: 204,
        headers: {},
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
            return await emailService.controller.sendTestEmail(frame);
        }
    }
};
