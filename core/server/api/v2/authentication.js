const api = require('./index');
const web = require('../../web');
const models = require('../../models');
const auth = require('../../services/auth');
const invitations = require('../../services/invitations');

module.exports = {
    docName: 'authentication',

    generateResetToken: {
        permissions: true,
        options: [
            'email'
        ],
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(true);
                })
                .then(() => {
                    return auth.passwordreset.generateToken(frame.data.email, api.settings);
                })
                .then((token) => {
                    return auth.passwordreset.sendResetNotification(token, api.mail);
                });
        }
    },
    resetPassword: {
        validation: {
            docName: 'passwordreset',
            data: {
                token: {required: true},
                newPassword: {required: true},
                ne2Password: {required: true}
            }
        },
        permissions: false,
        options: [
            'ip'
        ],
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(true);
                })
                .then(() => {
                    return auth.passwordreset.extractTokenParts(frame);
                })
                .then((params) => {
                    return auth.passwordreset.protectBruteForce(params);
                })
                .then(({options, tokenParts}) => {
                    options = Object.assign(options, {context: {internal: true}});
                    return auth.passwordreset.doReset(options, tokenParts, api.settings)
                        .then((params) => {
                            web.shared.middlewares.api.spamPrevention.userLogin().reset(frame.options.ip, `${tokenParts.email}login`);
                            return params;
                        });
                });
        }
    },

    acceptInvitation: {
        validation: {
            docName: 'invitations'
        },
        permissions: false,
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(true);
                })
                .then(() => {
                    return invitations.accept(frame.data);
                });
        }
    },

    isInvitation: {
        validation: {
            docName: 'invitations'
        },
        permissions: false,
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(true);
                })
                .then(() => {
                    const email = frame.data.email;

                    return models.Invite.findOne({email: email, status: 'sent'}, frame.options);
                });
        }
    }
};
