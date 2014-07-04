var dataProvider     = require('../models'),
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
    }
};

module.exports = authentication;