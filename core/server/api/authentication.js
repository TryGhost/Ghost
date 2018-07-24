const Promise = require('bluebird'),
    {extend, merge, omit, cloneDeep, assign} = require('lodash'),
    validator = require('validator'),
    config = require('../config'),
    common = require('../lib/common'),
    security = require('../lib/security'),
    constants = require('../lib/constants'),
    pipeline = require('../lib/promise/pipeline'),
    mail = require('../services/mail'),
    urlService = require('../services/url'),
    localUtils = require('./utils'),
    models = require('../models'),
    spamPrevention = require('../web/middleware/api/spam-prevention'),
    mailAPI = require('./mail'),
    settingsAPI = require('./settings'),
    tokenSecurity = {};

let authentication;

/**
 * Returns setup status
 *
 * @return {Promise<Boolean>}
 */
function checkSetup() {
    return authentication.isSetup().then(function then(result) {
        return result.setup[0].status;
    });
}

/**
 * Allows an assertion to be made about setup status.
 *
 * @param  {Boolean} status True: setup must be complete. False: setup must not be complete.
 * @return {Function} returns a "task ready" function
 */
function assertSetupCompleted(status) {
    return function checkPermission(__) {
        return checkSetup().then(function then(isSetup) {
            if (isSetup === status) {
                return __;
            }

            const completed = common.i18n.t('errors.api.authentication.setupAlreadyCompleted'),
                notCompleted = common.i18n.t('errors.api.authentication.setupMustBeCompleted');

            function throwReason(reason) {
                throw new common.errors.NoPermissionError({message: reason});
            }

            if (isSetup) {
                throwReason(completed);
            } else {
                throwReason(notCompleted);
            }
        });
    };
}

function setupTasks(setupData) {
    let tasks;

    function validateData(setupData) {
        return localUtils.checkObject(setupData, 'setup').then(function then(checked) {
            const data = checked.setup[0];

            return {
                name: data.name,
                email: data.email,
                password: data.password,
                blogTitle: data.blogTitle,
                status: 'active'
            };
        });
    }

    function setupUser(userData) {
        const context = {context: {internal: true}},
            User = models.User;

        return User.findOne({role: 'Owner', status: 'all'}).then(function then(owner) {
            if (!owner) {
                throw new common.errors.GhostError({
                    message: common.i18n.t('errors.api.authentication.setupUnableToRun')
                });
            }

            return User.setup(userData, extend({id: owner.id}, context));
        }).then(function then(user) {
            return {
                user: user,
                userData: userData
            };
        });
    }

    function doSettings(data) {
        const user = data.user,
            blogTitle = data.userData.blogTitle,
            context = {context: {user: data.user.id}};

        let userSettings;

        if (!blogTitle || typeof blogTitle !== 'string') {
            return user;
        }

        userSettings = [
            {key: 'title', value: blogTitle.trim()},
            {key: 'description', value: common.i18n.t('common.api.authentication.sampleBlogDescription')}
        ];

        return settingsAPI.edit({settings: userSettings}, context).return(user);
    }

    function formatResponse(user) {
        return user.toJSON({context: {internal: true}});
    }

    tasks = [
        validateData,
        setupUser,
        doSettings,
        formatResponse
    ];

    return pipeline(tasks, setupData);
}

/**
 * ## Authentication API Methods
 *
 * **See:** [API Methods](events.js.html#api%20methods)
 */
authentication = {
    /**
     * @description generate a reset token for a given email address
     * @param {Object} object
     * @returns {Promise<Object>} message
     */
    generateResetToken: function generateResetToken(object) {
        let tasks;

        function validateRequest(object) {
            return localUtils.checkObject(object, 'passwordreset').then(function then(data) {
                const email = data.passwordreset[0].email;

                if (typeof email !== 'string' || !validator.isEmail(email)) {
                    throw new common.errors.BadRequestError({
                        message: common.i18n.t('errors.api.authentication.noEmailProvided')
                    });
                }

                return email;
            });
        }

        function generateToken(email) {
            const options = {context: {internal: true}};
            let dbHash, token;

            return settingsAPI.read(merge({key: 'db_hash'}, options))
                .then(function fetchedSettings(response) {
                    dbHash = response.settings[0].value;

                    return models.User.getByEmail(email, options);
                })
                .then(function fetchedUser(user) {
                    if (!user) {
                        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.users.userNotFound')});
                    }

                    token = security.tokens.resetToken.generateHash({
                        expires: Date.now() + constants.ONE_DAY_MS,
                        email: email,
                        dbHash: dbHash,
                        password: user.get('password')
                    });

                    return {
                        email: email,
                        resetToken: token
                    };
                });
        }

        function sendResetNotification(data) {
            const adminUrl = urlService.utils.urlFor('admin', true),
                resetUrl = urlService.utils.urlJoin(adminUrl, 'reset', security.url.encodeBase64(data.resetToken), '/');

            return mail.utils.generateContent({
                data: {
                    resetUrl: resetUrl
                },
                template: 'reset-password'
            }).then(function then(content) {
                const payload = {
                    mail: [{
                        message: {
                            to: data.email,
                            subject: common.i18n.t('common.api.authentication.mail.resetPassword'),
                            html: content.html,
                            text: content.text
                        },
                        options: {}
                    }]
                };

                return mailAPI.send(payload, {context: {internal: true}});
            });
        }

        function formatResponse() {
            return {
                passwordreset: [
                    {message: common.i18n.t('common.api.authentication.mail.checkEmailForInstructions')}
                ]
            };
        }

        tasks = [
            assertSetupCompleted(true),
            validateRequest,
            generateToken,
            sendResetNotification,
            formatResponse
        ];

        return pipeline(tasks, object);
    },

    /**
     * ## Reset Password
     * reset password if a valid token and password (2x) is passed
     * @param {Object} object
     * @returns {Promise<Object>} message
     */
    resetPassword: function resetPassword(object, opts) {
        let tasks,
            tokenIsCorrect,
            dbHash,
            tokenParts;
        const options = {context: {internal: true}};

        function validateRequest() {
            return localUtils.validate('passwordreset')(object, options)
                .then((options) => {
                    const data = options.data.passwordreset[0];

                    if (data.newPassword !== data.ne2Password) {
                        return Promise.reject(new common.errors.ValidationError({
                            message: common.i18n.t('errors.models.user.newPasswordsDoNotMatch')
                        }));
                    }

                    return Promise.resolve(options);
                });
        }

        function extractTokenParts(options) {
            options.data.passwordreset[0].token = security.url.decodeBase64(options.data.passwordreset[0].token);

            tokenParts = security.tokens.resetToken.extract({
                token: options.data.passwordreset[0].token
            });

            if (!tokenParts) {
                return Promise.reject(new common.errors.UnauthorizedError({
                    message: common.i18n.t('errors.api.common.invalidTokenStructure')
                }));
            }

            return Promise.resolve(options);
        }

        // @TODO: use brute force middleware (see https://github.com/TryGhost/Ghost/pull/7579)
        function protectBruteForce(options) {
            if (tokenSecurity[`${tokenParts.email}+${tokenParts.expires}`] &&
                tokenSecurity[`${tokenParts.email}+${tokenParts.expires}`].count >= 10) {
                return Promise.reject(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.models.user.tokenLocked')
                }));
            }

            return Promise.resolve(options);
        }

        function doReset(options) {
            const data = options.data.passwordreset[0],
                resetToken = data.token,
                oldPassword = data.oldPassword,
                newPassword = data.newPassword;

            return settingsAPI.read(merge({key: 'db_hash'}, omit(options, 'data')))
                .then(function fetchedSettings(response) {
                    dbHash = response.settings[0].value;

                    return models.User.getByEmail(tokenParts.email, options);
                })
                .then(function fetchedUser(user) {
                    if (!user) {
                        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.users.userNotFound')});
                    }

                    tokenIsCorrect = security.tokens.resetToken.compare({
                        token: resetToken,
                        dbHash: dbHash,
                        password: user.get('password')
                    });

                    if (!tokenIsCorrect) {
                        return Promise.reject(new common.errors.BadRequestError({
                            message: common.i18n.t('errors.api.common.invalidTokenStructure')
                        }));
                    }

                    spamPrevention.userLogin().reset(opts.ip, `${tokenParts.email}login`);

                    return models.User.changePassword({
                        oldPassword: oldPassword,
                        newPassword: newPassword,
                        user_id: user.id
                    }, options);
                })
                .then(function changedPassword(updatedUser) {
                    updatedUser.set('status', 'active');
                    return updatedUser.save(options);
                })
                .catch(common.errors.ValidationError, (err) => { return Promise.reject(err); })
                .catch((err) => {
                    if (common.errors.utils.isIgnitionError(err)) {
                        return Promise.reject(err);
                    }
                    return Promise.reject(new common.errors.UnauthorizedError({err: err}));
                });
        }

        function formatResponse() {
            return {
                passwordreset: [
                    {message: common.i18n.t('common.api.authentication.mail.passwordChanged')}
                ]
            };
        }

        tasks = [
            validateRequest,
            assertSetupCompleted(true),
            extractTokenParts,
            protectBruteForce,
            doReset,
            formatResponse
        ];

        return pipeline(tasks, object, options);
    },

    /**
     * ### Accept Invitation
     * @param {Object} invitation an invitation object
     * @returns {Promise<Object>}
     */
    acceptInvitation: function acceptInvitation(invitation) {
        let tasks,
            invite;
        const options = {context: {internal: true}};

        function validateInvitation(invitation) {
            return localUtils.checkObject(invitation, 'invitation')
                .then(() => {
                    if (!invitation.invitation[0].token) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noTokenProvided')}));
                    }

                    if (!invitation.invitation[0].email) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noEmailProvided')}));
                    }

                    if (!invitation.invitation[0].password) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noPasswordProvided')}));
                    }

                    if (!invitation.invitation[0].name) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.api.authentication.noNameProvided')}));
                    }

                    return invitation;
                });
        }

        function processInvitation(invitation) {
            const data = invitation.invitation[0],
                inviteToken = security.url.decodeBase64(data.token);

            return models.Invite.findOne({token: inviteToken, status: 'sent'}, options)
                .then((_invite) => {
                    invite = _invite;

                    if (!invite) {
                        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteNotFound')});
                    }

                    if (invite.get('expires') < Date.now()) {
                        throw new common.errors.NotFoundError({message: common.i18n.t('errors.api.invites.inviteExpired')});
                    }

                    return models.User.add({
                        email: data.email,
                        name: data.name,
                        password: data.password,
                        roles: [invite.toJSON().role_id]
                    }, options);
                })
                .then(() => { return invite.destroy(options); });
        }

        function formatResponse() {
            return {
                invitation: [
                    {message: common.i18n.t('common.api.authentication.mail.invitationAccepted')}
                ]
            };
        }

        tasks = [
            assertSetupCompleted(true),
            validateInvitation,
            processInvitation,
            formatResponse
        ];

        return pipeline(tasks, invitation);
    },

    /**
     * ### Check for invitation
     * @param {Object} options
     * @returns {Promise<Object>} An invitation status
     */
    isInvitation: function isInvitation(options) {
        let tasks;
        const localOptions = cloneDeep(options || {});

        function processArgs(options) {
            const email = options.email;

            if (typeof email !== 'string' || !validator.isEmail(email)) {
                throw new common.errors.BadRequestError({
                    message: common.i18n.t('errors.api.authentication.invalidEmailReceived')
                });
            }

            return email;
        }

        function checkInvitation(email) {
            return models.Invite
                .findOne({email: email, status: 'sent'}, options)
                .then(function fetchedInvite(invite) {
                    if (!invite) {
                        return {invitation: [{valid: false}]};
                    }

                    return models.User.findOne({id: invite.get('created_by')})
                        .then(function fetchedUser(user) {
                            return {invitation: [{valid: true, invitedBy: user.get('name')}]};
                        });
                });
        }

        tasks = [
            processArgs,
            assertSetupCompleted(true),
            checkInvitation
        ];

        return pipeline(tasks, localOptions);
    },

    /**
     * Checks the setup status
     * @return {Promise}
     */
    isSetup: function isSetup() {
        let tasks;

        function checkSetupStatus() {
            return models.User.isSetup();
        }

        function formatResponse(isSetup) {
            return {
                setup: [
                    {
                        status: isSetup,
                        // Pre-populate from config if, and only if the values exist in config.
                        title: config.title || undefined,
                        name: config.user_name || undefined,
                        email: config.user_email || undefined
                    }
                ]
            };
        }

        tasks = [
            checkSetupStatus,
            formatResponse
        ];

        return pipeline(tasks);
    },

    /**
     * Executes the setup tasks and sends an email to the owner
     * @param  {Object} setupDetails
     * @return {Promise<Object>} a user api payload
     */
    setup: function setup(setupDetails) {
        let tasks;

        function doSetup(setupDetails) {
            return setupTasks(setupDetails);
        }

        function sendNotification(setupUser) {
            const data = {
                ownerEmail: setupUser.email
            };

            common.events.emit('setup.completed', setupUser);

            return mail.utils.generateContent({data: data, template: 'welcome'})
                .then(function then(content) {
                    const message = {
                            to: setupUser.email,
                            subject: common.i18n.t('common.api.authentication.mail.yourNewGhostBlog'),
                            html: content.html,
                            text: content.text
                        },
                        payload = {
                            mail: [{
                                message: message,
                                options: {}
                            }]
                        };

                    mailAPI.send(payload, {context: {internal: true}})
                        .catch((err) => {
                            err.context = common.i18n.t('errors.api.authentication.unableToSendWelcomeEmail');
                            common.logging.error(err);
                        });
                })
                .return(setupUser);
        }

        function formatResponse(setupUser) {
            return {users: [setupUser]};
        }

        tasks = [
            assertSetupCompleted(false),
            doSetup,
            sendNotification,
            formatResponse
        ];

        return pipeline(tasks, setupDetails);
    },

    /**
     * Updates the blog setup
     * @param  {Object} setupDetails request payload with setup details
     * @param  {Object} options
     * @return {Promise<Object>} a User API response payload
     */
    updateSetup: function updateSetup(setupDetails, options) {
        let tasks;
        const localOptions = cloneDeep(options || {});

        function processArgs(setupDetails, options) {
            if (!options.context || !options.context.user) {
                throw new common.errors.NoPermissionError({message: common.i18n.t('errors.api.authentication.notTheBlogOwner')});
            }

            return assign({setupDetails: setupDetails}, options);
        }

        function checkPermission(options) {
            return models.User.findOne({role: 'Owner', status: 'all'})
                .then((owner) => {
                    if (owner.id !== options.context.user) {
                        throw new common.errors.NoPermissionError({message: common.i18n.t('errors.api.authentication.notTheBlogOwner')});
                    }

                    return options.setupDetails;
                });
        }

        function formatResponse(user) {
            return {users: [user]};
        }

        tasks = [
            processArgs,
            assertSetupCompleted(true),
            checkPermission,
            setupTasks,
            formatResponse
        ];

        return pipeline(tasks, setupDetails, localOptions);
    },

    /**
     * Revokes a bearer token.
     * @param {Object} tokenDetails
     * @param {Object} options
     * @return {Promise<Object>} an object containing the revoked token.
     */
    revoke: function revokeToken(tokenDetails, options) {
        let tasks;
        const localOptions = cloneDeep(options || {});

        function processArgs(tokenDetails, options) {
            return assign({}, tokenDetails, options);
        }

        function revokeToken(options) {
            const providers = [
                    models.Refreshtoken,
                    models.Accesstoken
                ],
                response = {token: options.token};

            function destroyToken(provider, options, providers) {
                return provider.destroyByToken(options)
                    .return(response)
                    .catch(provider.NotFoundError, () => {
                        if (!providers.length) {
                            return {
                                token: tokenDetails.token,
                                error: common.i18n.t('errors.api.authentication.invalidTokenProvided')
                            };
                        }

                        return destroyToken(providers.pop(), options, providers);
                    })
                    .catch(() => {
                        throw new common.errors.TokenRevocationError({
                            message: common.i18n.t('errors.api.authentication.tokenRevocationFailed')
                        });
                    });
            }

            return destroyToken(providers.pop(), options, providers);
        }

        tasks = [
            processArgs,
            revokeToken
        ];

        return pipeline(tasks, tokenDetails, localOptions);
    }
};

module.exports = authentication;
