const Promise = require('bluebird'),
    {cloneDeep, assign} = require('lodash'),
    validator = require('validator'),
    config = require('../../config'),
    common = require('../../lib/common'),
    pipeline = require('../../lib/promise/pipeline'),
    auth = require('../../services/auth'),
    invitations = require('../../services/invitations'),
    localUtils = require('./utils'),
    models = require('../../models'),
    web = require('../../web'),
    mailAPI = require('./mail'),
    settingsAPI = require('./settings');

let authentication;

function setupTasks(setupData) {
    let tasks;

    function validateData(setupData) {
        return localUtils.checkObject(setupData, 'setup').then((checked) => {
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

    function doSettings(data) {
        return auth.setup.doSettings(data, settingsAPI);
    }

    function formatResponse(user) {
        return user.toJSON({context: {internal: true}});
    }

    tasks = [
        validateData,
        auth.setup.setupUser,
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
    generateResetToken(object) {
        let tasks;

        function validateRequest(object) {
            return localUtils.checkObject(object, 'passwordreset').then((data) => {
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
            return auth.passwordreset.generateToken(email, settingsAPI);
        }

        function sendResetNotification(data) {
            return auth.passwordreset.sendResetNotification(data, mailAPI);
        }

        function formatResponse() {
            return {
                passwordreset: [
                    {message: common.i18n.t('common.api.authentication.mail.checkEmailForInstructions')}
                ]
            };
        }

        tasks = [
            auth.setup.assertSetupCompleted(true),
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
    resetPassword(object, opts) {
        let tasks;
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

        function doReset({options, tokenParts}) {
            return auth.passwordreset.doReset(options, tokenParts, settingsAPI)
                .then((params) => {
                    web.shared.middlewares.api.spamPrevention.userLogin().reset(opts.ip, `${tokenParts.email}login`);
                    return params;
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
            auth.setup.assertSetupCompleted(true),
            auth.passwordreset.extractTokenParts,
            auth.passwordreset.protectBruteForce,
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
    acceptInvitation(invitation) {
        let tasks;

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

        function formatResponse() {
            return {
                invitation: [
                    {message: common.i18n.t('common.api.authentication.mail.invitationAccepted')}
                ]
            };
        }

        tasks = [
            auth.setup.assertSetupCompleted(true),
            validateInvitation,
            invitations.accept,
            formatResponse
        ];

        return pipeline(tasks, invitation);
    },

    /**
     * ### Check for invitation
     * @param {Object} options
     * @returns {Promise<Object>} An invitation status
     */
    isInvitation(options) {
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
                .then((invite) => {
                    if (!invite) {
                        return {invitation: [{valid: false}]};
                    }

                    return {invitation: [{valid: true}]};
                });
        }

        tasks = [
            processArgs,
            auth.setup.assertSetupCompleted(true),
            checkInvitation
        ];

        return pipeline(tasks, localOptions);
    },

    /**
     * Checks the setup status
     * @return {Promise}
     */
    isSetup() {
        let tasks;

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
            auth.setup.checkIsSetup,
            formatResponse
        ];

        return pipeline(tasks);
    },

    /**
     * Executes the setup tasks and sends an email to the owner
     * @param  {Object} setupDetails
     * @return {Promise<Object>} a user api payload
     */
    setup(setupDetails) {
        let tasks;

        function doSetup(setupDetails) {
            return setupTasks(setupDetails);
        }

        function sendNotification(setupUser) {
            return auth.setup.sendNotification(setupUser, mailAPI);
        }

        function formatResponse(setupUser) {
            return {users: [setupUser]};
        }

        tasks = [
            auth.setup.assertSetupCompleted(false),
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
    updateSetup(setupDetails, options) {
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
            auth.setup.assertSetupCompleted(true),
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
    revoke(tokenDetails, options) {
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
