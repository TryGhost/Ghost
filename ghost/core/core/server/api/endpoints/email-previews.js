const emailService = require('../../services/email-service');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'email_previews',

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'fields',
            'member_status',
            'member_tier',
            'memberSegment',
            'newsletter'
        ],
        validation: {
            options: {
                fields: ['html', 'plaintext', 'subject'],
                member_status: {
                    values: ['free', 'paid']
                }
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
            return await emailService.controller.sendTestEmail(frame);
        }
    }
};

module.exports = controller;
