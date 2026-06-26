const memberWelcomeEmailService = require('../../services/member-welcome-emails/service');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automation_email_previews',

    preview: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        data: [
            'subject',
            'lexical'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'automations',
            method: 'edit'
        },
        async query(frame) {
            memberWelcomeEmailService.init();
            return await memberWelcomeEmailService.api.previewAutomationEmail({
                automationId: frame.options.id,
                subject: frame.data.subject,
                lexical: frame.data.lexical
            });
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
        data: [
            'email',
            'subject',
            'lexical'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'automations',
            method: 'edit'
        },
        async query(frame) {
            memberWelcomeEmailService.init();
            await memberWelcomeEmailService.api.sendTestAutomationEmail({
                automationId: frame.options.id,
                email: frame.data.email,
                subject: frame.data.subject,
                lexical: frame.data.lexical
            });
        }
    }
};

module.exports = controller;
