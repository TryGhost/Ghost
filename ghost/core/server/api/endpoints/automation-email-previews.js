const memberWelcomeEmails = require('../../services/member-welcome-emails').default;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'automation_email_previews',

  preview: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    data: ['subject', 'lexical'],
    validation: {
      options: {
        id: {
          required: true,
        },
      },
    },
    permissions: {
      docName: 'automations',
      method: 'edit',
    },
    async query(frame) {
      return await memberWelcomeEmails.service.previewAutomationEmail({
        automationId: frame.options.id,
        subject: frame.data.subject,
        lexical: frame.data.lexical,
      });
    },
  },

  sendTestEmail: {
    statusCode: 204,
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    data: ['email', 'subject', 'lexical'],
    validation: {
      options: {
        id: {
          required: true,
        },
      },
    },
    permissions: {
      docName: 'automations',
      method: 'edit',
    },
    async query(frame) {
      await memberWelcomeEmails.service.sendTestAutomationEmail({
        automationId: frame.options.id,
        email: frame.data.email,
        subject: frame.data.subject,
        lexical: frame.data.lexical,
      });
    },
  },
};

module.exports = controller;
