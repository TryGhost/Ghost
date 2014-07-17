var _                = require('lodash'),
    dataProvider     = require('../models'),
    settings         = require('./settings'),
    mail             = require('./mail'),
    utils            = require('./utils'),
    when             = require('when'),
    errors           = require('../errors'),
    config           = require('../config'),
    ONE_DAY          = 60 * 60 * 24 * 1000,
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
     * @param {{passwordreset}}
     * @returns {Promise(passwordreset)} message
     */
    generateResetToken: function generateResetToken(object) {
        var expires = Date.now() + ONE_DAY,
            email;

        return utils.checkObject(object, 'passwordreset').then(function (checkedPasswordReset) {
            if (checkedPasswordReset.passwordreset[0].email) {
                email = checkedPasswordReset.passwordreset[0].email;
            } else {
                return when.reject(new errors.BadRequestError('No email provided.'));
            }

            return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
                var dbHash = response.settings[0].value;
                return dataProvider.User.generateResetToken(email, expires, dbHash);
            }).then(function (resetToken) {
                var baseUrl = config().forceAdminSSL ? (config().urlSSL || config().url) : config().url,
                    siteLink = '<a href="' + baseUrl + '">' + baseUrl + '</a>',
                    resetUrl = baseUrl.replace(/\/$/, '') +  '/ghost/reset/' + resetToken + '/',
                    resetLink = '<a href="' + resetUrl + '">' + resetUrl + '</a>',
                    payload = {
                        mail: [{
                            message: {
                                to: email,
                                subject: 'Reset Password',
                                html: '<p><strong>Hello!</strong></p>' +
                                    '<p>A request has been made to reset the password on the site ' + siteLink + '.</p>' +
                                    '<p>Please follow the link below to reset your password:<br><br>' + resetLink + '</p>' +
                                    '<p>Ghost</p>'
                            },
                            options: {}
                        }]
                    };

                return mail.send(payload);
            }).then(function () {
                return when.resolve({passwordreset: [{message: 'Check your email for further instructions.'}]});
            }).otherwise(function (error) {
                // TODO: This is kind of sketchy, depends on magic string error.message from Bookshelf.
                if (error && error.message === 'NotFound') {
                    error = new errors.UnauthorizedError('Invalid email address');
                }
                return when.reject(error);
            });
        });
    },

    /**
     * ## Reset Password
     * reset password if a valid token and password (2x) is passed
     * @param {{passwordreset}}
     * @returns {Promise(passwordreset)} message
     */
    resetPassword: function resetPassword(object) {
        var resetToken,
            newPassword,
            ne2Password;
        return utils.checkObject(object, 'passwordreset').then(function (checkedPasswordReset) {
            resetToken = checkedPasswordReset.passwordreset[0].token;
            newPassword = checkedPasswordReset.passwordreset[0].newPassword;
            ne2Password = checkedPasswordReset.passwordreset[0].ne2Password;

            return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
                var dbHash = response.settings[0].value;
                return dataProvider.User.resetPassword(resetToken, newPassword, ne2Password, dbHash);
            }).then(function () {
                return when.resolve({passwordreset: [{message: 'Password changed successfully.'}]});
            }).otherwise(function (error) {
                return when.reject(new errors.UnauthorizedError(error.message));
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

        return utils.checkObject(object, 'invitation').then(function (checkedInvitation) {
            resetToken = checkedInvitation.invitation[0].token;
            newPassword = checkedInvitation.invitation[0].password;
            ne2Password = checkedInvitation.invitation[0].password;
            email = checkedInvitation.invitation[0].email;
            name = checkedInvitation.invitation[0].name;

            return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
                var dbHash = response.settings[0].value;
                return dataProvider.User.resetPassword(resetToken, newPassword, ne2Password, dbHash);
            }).then(function (user) {
                return dataProvider.User.edit({name: name, email: email}, {id: user.id});
            }).then(function () {
                return when.resolve({invitation: [{message: 'Invitation accepted.'}]});
            }).otherwise(function (error) {
                return when.reject(new errors.UnauthorizedError(error.message));
            });
        });
    },

    isSetup: function () {

        return dataProvider.User.query(function (qb) {
                qb.where('status', '=', 'active')
                    .orWhere('status', '=', 'warn-1')
                    .orWhere('status', '=', 'warn-2')
                    .orWhere('status', '=', 'warn-3')
                    .orWhere('status', '=', 'warn-4')
                    .orWhere('status', '=', 'locked');
            }).fetch().then(function (users) {

            if (users) {
                return when.resolve({ setup: [{status: true}]});
            } else {
                return when.resolve({ setup: [{status: false}]});
            }
        });
    },

    setup: function (object) {
        var setupUser;

        return utils.checkObject(object, 'setup').then(function (checkedSetupData) {
            setupUser = {
                name: checkedSetupData.setup[0].name,
                email: checkedSetupData.setup[0].email,
                password: checkedSetupData.setup[0].password,
                blogTitle: checkedSetupData.setup[0].blogTitle,
                status: 'active'
            };
            return dataProvider.User.findAll();
        }).then(function (users) {
            if (users.length > 0) {
                return dataProvider.User.setup(setupUser, {id: 1});
            } else {
                // TODO: needs to pass owner role when role endpoint is finished!
                return dataProvider.User.add(setupUser);
            }
        }).then(function (user) {
            var userSettings = [];

            userSettings.push({key: 'email', value: setupUser.email});

            // Handles the additional values set by the setup screen.
            if (!_.isEmpty(setupUser.blogTitle)) {
                userSettings.push({key: 'title', value: setupUser.blogTitle});
                userSettings.push({key: 'description', value: 'Thoughts, stories and ideas by ' + setupUser.name});
            }
            setupUser = user.toJSON();
            return settings.edit({settings: userSettings}, {context: {user: 1}});
        }).then(function () {
            var message = {
                    to: setupUser.email,
                    subject: 'Your New Ghost Blog',
                    html: '<p><strong>Hello!</strong></p>' +
                          '<p>Good news! You\'ve successfully created a brand new Ghost blog over on ' + config().url + '</p>' +
                          '<p>You can log in to your admin account with the following details:</p>' +
                          '<p> Email Address: ' + setupUser.email + '<br>' +
                          'Password: The password you chose when you signed up</p>' +
                          '<p>Keep this email somewhere safe for future reference, and have fun!</p>' +
                          '<p>xoxo</p>' +
                          '<p>Team Ghost<br>' +
                          '<a href="https://ghost.org">https://ghost.org</a></p>'
                },
                payload = {
                    mail: [{
                        message: message,
                        options: {}
                    }]
                };

            return mail.send(payload).otherwise(function (error) {
                errors.logError(
                    error.message,
                    "Unable to send welcome email, your blog will continue to function.",
                    "Please see http://docs.ghost.org/mail/ for instructions on configuring email."
                );
            });
        }).then(function () {
            return when.resolve({ users: [setupUser]});
        }).otherwise(function (error) {
            return when.reject(new errors.UnauthorizedError(error.message));
        });
    }
};

module.exports = authentication;