const api = require('./index');
const config = require('../../../shared/config');
const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');
const web = require('../../web');
const models = require('../../models');
const auth = require('../../services/auth');
const invitations = require('../../services/invitations');

module.exports = {
    docName: 'authentication',

    setup: {
        statusCode: 201,
        permissions: false,
        validation: {
            docName: 'setup'
        },
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(false)();
                })
                .then(() => {
                    const setupDetails = {
                        name: frame.data.setup[0].name,
                        email: frame.data.setup[0].email,
                        password: frame.data.setup[0].password,
                        blogTitle: frame.data.setup[0].blogTitle,
                        status: 'active'
                    };

                    return auth.setup.setupUser(setupDetails);
                })
                .then((data) => {
                    return auth.setup.doSettings(data, api.settings);
                })
                .then((user) => {
                    return auth.setup.sendWelcomeEmail(user.get('email'), api.mail)
                        .then(() => user);
                });
        }
    },

    updateSetup: {
        permissions: (frame) => {
            return models.User.findOne({role: 'Owner', status: 'all'})
                .then((owner) => {
                    if (owner.id !== frame.options.context.user) {
                        throw new errors.NoPermissionError({message: i18n.t('errors.api.authentication.notTheBlogOwner')});
                    }
                });
        },
        validation: {
            docName: 'setup'
        },
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(true)();
                })
                .then(() => {
                    const setupDetails = {
                        name: frame.data.setup[0].name,
                        email: frame.data.setup[0].email,
                        password: frame.data.setup[0].password,
                        blogTitle: frame.data.setup[0].blogTitle,
                        status: 'active'
                    };

                    return auth.setup.setupUser(setupDetails);
                })
                .then((data) => {
                    return auth.setup.doSettings(data, api.settings);
                });
        }
    },

    isSetup: {
        permissions: false,
        async query() {
            const isSetup = await auth.setup.checkIsSetup();

            return {
                status: isSetup,
                title: config.title,
                name: config.user_name,
                email: config.user_email
            };
        }
    },

    generateResetToken: {
        validation: {
            docName: 'passwordreset'
        },
        permissions: true,
        options: [
            'email'
        ],
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(true)();
                })
                .then(() => {
                    return auth.passwordreset.generateToken(frame.data.passwordreset[0].email, api.settings);
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
                    return auth.setup.assertSetupCompleted(true)();
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
                    return auth.setup.assertSetupCompleted(true)();
                })
                .then(() => {
                    return invitations.accept(frame.data);
                });
        }
    },

    isInvitation: {
        data: [
            'email'
        ],
        validation: {
            docName: 'invitations'
        },
        permissions: false,
        query(frame) {
            return Promise.resolve()
                .then(() => {
                    return auth.setup.assertSetupCompleted(true)();
                })
                .then(() => {
                    const email = frame.data.email;

                    return models.Invite.findOne({email: email, status: 'sent'}, frame.options);
                });
        }
    }
};
