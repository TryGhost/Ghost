const Promise = require('bluebird');
const api = require('./index');
const config = require('../../../shared/config');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const web = require('../../web');
const models = require('../../models');
const auth = require('../../services/auth');
const invitations = require('../../services/invitations');
const dbBackup = require('../../data/db/backup');
const apiMail = require('./index').mail;
const apiSettings = require('./index').settings;
const UsersService = require('../../services/users');
const userService = new UsersService({dbBackup, models, auth, apiMail, apiSettings});
const {deleteAllSessions} = require('../../services/auth/session');

const messages = {
    notTheBlogOwner: 'You are not the site owner.'
};

module.exports = {
    docName: 'authentication',

    setup: {
        statusCode: 201,
        permissions: false,
        headers: {
            cacheInvalidate: true
        },
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
                    try {
                        return auth.setup.doProduct(data, api.products);
                    } catch (e) {
                        return data;
                    }
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
        headers: {
            cacheInvalidate: true
        },
        permissions: (frame) => {
            return models.User.findOne({role: 'Owner', status: 'all'})
                .then((owner) => {
                    if (owner.id !== frame.options.context.user) {
                        throw new errors.NoPermissionError({message: tpl(messages.notTheBlogOwner)});
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
                            web.shared.middleware.api.spamPrevention.userLogin().reset(frame.options.ip, `${tokenParts.email}login`);
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
    },

    resetAllPasswords: {
        permissions: true,
        async query(frame) {
            await userService.resetAllPasswords(frame.options);
            await deleteAllSessions();
        }
    }
};
