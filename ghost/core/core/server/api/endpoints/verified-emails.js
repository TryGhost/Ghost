const models = require('../../models');
const emailVerificationService = require('../../services/email-verification');

const controller = {
    docName: 'verified_emails',

    browse: {
        headers: {cacheInvalidate: false},
        options: ['limit', 'page', 'order', 'filter'],
        permissions: true,
        async query(frame) {
            return models.VerifiedEmail.findPage(frame.options);
        }
    },

    add: {
        statusCode: 201,
        headers: {cacheInvalidate: true},
        permissions: true,
        async query(frame) {
            const data = frame.data.verified_emails[0];
            return await emailVerificationService.add(data.email, data.context);
        }
    },

    verify: {
        headers: {cacheInvalidate: true},
        permissions: {method: 'edit'},
        async query(frame) {
            const data = frame.data.verified_emails[0];
            const {verifiedEmail, context} = await emailVerificationService.verify(data.token);
            return {
                data: [verifiedEmail],
                meta: {context: context || null}
            };
        }
    },

    destroy: {
        statusCode: 204,
        headers: {cacheInvalidate: true},
        options: ['id'],
        permissions: true,
        async query(frame) {
            return emailVerificationService.destroy(frame.options.id);
        }
    }
};

module.exports = controller;
