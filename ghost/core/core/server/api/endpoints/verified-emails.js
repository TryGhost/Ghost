const emailVerificationService = require('../../services/email-verification');

const controller = {
    docName: 'verified_emails',

    browse: {
        headers: {cacheInvalidate: false},
        permissions: true,
        async query() {
            return emailVerificationService.list();
        }
    },

    add: {
        statusCode: 201,
        headers: {cacheInvalidate: false},
        permissions: true,
        data: ['email', 'context'],
        async query(frame) {
            return emailVerificationService.add(frame.data.email, frame.data.context);
        }
    },

    verify: {
        headers: {cacheInvalidate: true},
        permissions: {method: 'edit'},
        data: ['token'],
        async query(frame) {
            return emailVerificationService.verify(frame.data.token);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {cacheInvalidate: true},
        permissions: true,
        async query(frame) {
            return emailVerificationService.destroy(frame.options.id);
        }
    }
};

module.exports = controller;
