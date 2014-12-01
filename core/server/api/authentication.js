var _                = require('lodash'),
    dataProvider     = require('../models'),
    settings         = require('./settings'),
    mail             = require('./mail'),
    globalUtils      = require('../utils'),
    utils            = require('./utils'),
    Promise          = require('bluebird'),
    errors           = require('../errors'),
    config           = require('../config'),
    authentication;

/**
 * ## Authentication API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
authentication = {

    /**
     * ## Generate Reset Token
     * generate a reset token for a given email address
     * @param {Object} object
     * @returns {Promise(passwordreset)} message
     */
    generateResetToken: function generateResetToken(object) {
        var expires = Date.now() + globalUtils.ONE_DAY_MS,
            email;

        return authentication.isSetup().then(function (result) {
            var setup = result.setup[0].status;

            if (!setup) {
                return Promise.reject(new errors.NoPermissionError('Setup must be completed before making this request.'));
            }

            return utils.checkObject(object, 'passwordreset');
        }).then(function (checkedPasswordReset) {
            if (checkedPasswordReset.passwordreset[0].email) {
                email = checkedPasswordReset.passwordreset[0].email;
            } else {
                return Promise.reject(new errors.BadRequestError('No email provided.'));
            }

            return settings.read({context: {internal: true}, key: 'dbHash'})
            .then(function (response) {
                var dbHash = response.settings[0].value;
                return dataProvider.User.generateResetToken(email, expires, dbHash);
            }).then(function (resetToken) {
                var baseUrl = config.forceAdminSSL ? (config.urlSSL || config.url) : config.url,
                    resetUrl = baseUrl.replace(/\/$/, '') + '/ghost/reset/' + globalUtils.encodeBase64URLsafe(resetToken) + '/';

                return mail.generateContent({data: {resetUrl: resetUrl}, template: 'reset-password'});
            }).then(function (emailContent) {
                var payload = {
                    mail: [{
                        message: {
                            to: email,
                            subject: 'Reset Password',
                            html: emailContent.html,
                            text: emailContent.text
                        },
                        options: {}
                    }]
                };
                return mail.send(payload, {context: {internal: true}});
            }).then(function () {
                return Promise.resolve({passwordreset: [{message: 'Check your email for further instructions.'}]});
            }).catch(function (error) {
                return Promise.reject(error);
            });
        });
    },

    /**
     * ## Reset Password
     * reset password if a valid token and password (2x) is passed
     * @param {Object} object
     * @returns {Promise(passwordreset)} message
     */
    resetPassword: function resetPassword(object) {
        var resetToken,
            newPassword,
            ne2Password;

        return authentication.isSetup().then(function (result) {
            var setup = result.setup[0].status;

            if (!setup) {
                return Promise.reject(new errors.NoPermissionError('Setup must be completed before making this request.'));
            }

            return utils.checkObject(object, 'passwordreset');
        }).then(function (checkedPasswordReset) {
            resetToken = checkedPasswordReset.passwordreset[0].token;
            newPassword = checkedPasswordReset.passwordreset[0].newPassword;
            ne2Password = checkedPasswordReset.passwordreset[0].ne2Password;

            return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
                var dbHash = response.settings[0].value;
                return dataProvider.User.resetPassword(resetToken, newPassword, ne2Password, dbHash);
            }).then(function () {
                return Promise.resolve({passwordreset: [{message: 'Password changed successfully.'}]});
            }).catch(function (error) {
                return Promise.reject(new errors.UnauthorizedError(error.message));
            });
        });
    },

    /**
     * ### Accept Invitation
     * @param {User} object the user to create
     * @returns {Promise(User}} Newly created user
     */
    acceptInvitation: function acceptInvitation(object) {
        var resetToken,
            newPassword,
            ne2Password,
            name,
            email;

        return authentication.isSetup().then(function (result) {
            var setup = result.setup[0].status;

            if (!setup) {
                return Promise.reject(new errors.NoPermissionError('Setup must be completed before making this request.'));
            }

            return utils.checkObject(object, 'invitation');
        }).then(function (checkedInvitation) {
            resetToken = checkedInvitation.invitation[0].token;
            newPassword = checkedInvitation.invitation[0].password;
            ne2Password = checkedInvitation.invitation[0].password;
            email = checkedInvitation.invitation[0].email;
            name = checkedInvitation.invitation[0].name;

            return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
                var dbHash = response.settings[0].value;
                return dataProvider.User.resetPassword(resetToken, newPassword, ne2Password, dbHash);
            }).then(function (user) {
                // Setting the slug to '' has the model regenerate the slug from the user's name
                return dataProvider.User.edit({name: name, email: email, slug: ''}, {id: user.id});
            }).then(function () {
                return Promise.resolve({invitation: [{message: 'Invitation accepted.'}]});
            }).catch(function (error) {
                return Promise.reject(new errors.UnauthorizedError(error.message));
            });
        });
    },

    /**
     * ### Check for invitation
     * @param {Object} options
     * @param {string} options.email The email to check for an invitation on
     * @returns {Promise(Invitation}} An invitation status
     */
    isInvitation: function (options) {
        return authentication.isSetup().then(function (result) {
            var setup = result.setup[0].status;

            if (!setup) {
                return Promise.reject(new errors.NoPermissionError('Setup must be completed before making this request.'));
            }

            if (options.email) {
                return dataProvider.User.findOne({email: options.email, status: 'invited'}).then(function (response) {
                    if (response) {
                        return {invitation: [{valid: true}]};
                    } else {
                        return {invitation: [{valid: false}]};
                    }
                });
            } else {
                return Promise.reject(new errors.BadRequestError('The server did not receive a valid email'));
            }
        });
    },

    isSetup: function () {
        return dataProvider.User.query(function (qb) {
            qb.whereIn('status', ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked']);
        }).fetch().then(function (users) {
            if (users) {
                return Promise.resolve({setup: [{status: true}]});
            } else {
                return Promise.resolve({setup: [{status: false}]});
            }
        });
    },

    setup: function (object) {
        var setupUser,
            internal = {context: {internal: true}};

        return authentication.isSetup().then(function (result) {
            var setup = result.setup[0].status;

            if (setup) {
                return Promise.reject(new errors.NoPermissionError('Setup has already been completed.'));
            }

            return utils.checkObject(object, 'setup');
        }).then(function (checkedSetupData) {
            setupUser = {
                name: checkedSetupData.setup[0].name,
                email: checkedSetupData.setup[0].email,
                password: checkedSetupData.setup[0].password,
                blogTitle: checkedSetupData.setup[0].blogTitle,
                status: 'active'
            };

            return dataProvider.User.findOne({role: 'Owner', status: 'all'});
        }).then(function (ownerUser) {
            if (ownerUser) {
                return dataProvider.User.setup(setupUser, _.extend(internal, {id: ownerUser.id}));
            } else {
                return dataProvider.Role.findOne({name: 'Owner'}).then(function (ownerRole) {
                    setupUser.roles = [ownerRole.id];
                    return dataProvider.User.add(setupUser, internal);
                });
            }
        }).then(function (user) {
            var userSettings = [];

            userSettings.push({key: 'email', value: setupUser.email});

            // Handles the additional values set by the setup screen.
            if (!_.isEmpty(setupUser.blogTitle)) {
                userSettings.push({key: 'title', value: setupUser.blogTitle});
                userSettings.push({key: 'description', value: 'Thoughts, stories and ideas.'});
            }
            setupUser = user.toJSON();
            return settings.edit({settings: userSettings}, {context: {user: setupUser.id}});
        }).then(function () {
            var data = {
                ownerEmail: setupUser.email
            };

            return mail.generateContent({data: data, template: 'welcome'});
        }).then(function (emailContent) {
            var message = {
                    to: setupUser.email,
                    subject: 'Your New Ghost Blog',
                    html: emailContent.html,
                    text: emailContent.text
                },
                payload = {
                    mail: [{
                        message: message,
                        options: {}
                    }]
                };

            return mail.send(payload, {context: {internal: true}}).catch(function (error) {
                errors.logError(
                    error.message,
                    'Unable to send welcome email, your blog will continue to function.',
                    'Please see http://support.ghost.org/mail/ for instructions on configuring email.'
                );
            });
        }).then(function () {
            return Promise.resolve({users: [setupUser]});
        });
    },

    revoke: function (object) {
        var token;

        if (object.token_type_hint && object.token_type_hint === 'access_token') {
            token = dataProvider.Accesstoken;
        } else if (object.token_type_hint && object.token_type_hint === 'refresh_token') {
            token = dataProvider.Refreshtoken;
        } else {
            return errors.BadRequestError('Invalid token_type_hint given.');
        }

        return token.destroyByToken({token: object.token}).then(function () {
            return Promise.resolve({token: object.token});
        }, function () {
            // On error we still want a 200. See https://tools.ietf.org/html/rfc7009#page-5
            return Promise.resolve({token: object.token, error: 'Invalid token provided'});
        });
    }
};

module.exports = authentication;
