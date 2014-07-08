// # Users API
// RESTful API for the User resource
var when            = require('when'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    settings        = require('./settings'),
    canThis         = require('../permissions').canThis,
    errors          = require('../errors'),
    utils           = require('./utils'),
    globalUtils     = require('../utils'),
    config          = require('../config'),
    mail            = require('./mail'),

    docName         = 'users',
    ONE_DAY         = 60 * 60 * 24 * 1000,
    // TODO: implement created_by, updated_by
    allowedIncludes = ['permissions', 'roles', 'roles.permissions'],
    users;

// ## Helpers
function prepareInclude(include) {
    include = _.intersection(include.split(','), allowedIncludes);
    return include;
}



/**
 * ## Posts API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
users = {

    /**
     * ## Browse
     * Fetch all users
     * @param {{context}} options (optional)
     * @returns {Promise(Users)} Users Collection
     */
    browse: function browse(options) {
        options = options || {};
        return canThis(options.context).browse.user().then(function () {
            if (options.include) {
                options.include = prepareInclude(options.include);
            }
            return dataProvider.User.findAll(options).then(function (result) {
                return { users: result.toJSON() };
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to browse users.'));
        });
    },

    /**
     * ### Read
     * @param {{id, context}} options
     * @returns {Promise(User)} User
     */
    read: function read(options) {
        var attrs = ['id'],
            data = _.pick(options, attrs);

        options = _.omit(options, attrs);

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        if (data.id === 'me' && options.context && options.context.user) {
            data.id = options.context.user;
        }

        return dataProvider.User.findOne(data, options).then(function (result) {
            if (result) {
                return { users: [result.toJSON()] };
            }

            return when.reject(new errors.NotFoundError('User not found.'));
        });
    },

    /**
     * ### Edit
     * @param {User} object the user details to edit
     * @param {{id, context}} options
     * @returns {Promise(User)}
     */
    edit: function edit(object, options) {
        if (options.id === 'me' && options.context && options.context.user) {
            options.id = options.context.user;
        }

        return canThis(options.context).edit.user(options.id).then(function () {
            return utils.checkObject(object, docName).then(function (checkedUserData) {

                if (options.include) {
                    options.include = prepareInclude(options.include);
                }

                return dataProvider.User.edit(checkedUserData.users[0], options);
            }).then(function (result) {
                if (result) {
                    return { users: [result.toJSON()]};
                }
                return when.reject(new errors.NotFoundError('User not found.'));
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to edit this users.'));
        });
    },

    /**
     * ### Add
     * @param {User} object the user to create
     * @param {{context}} options
     * @returns {Promise(User}} Newly created user
     */
    // TODO: remove and rename invite to add when setup is implemented
    add: function add(object, options) {
        options = options || {};

        return canThis(options.context).add.user().then(function () {
            return utils.checkObject(object, docName).then(function (checkedUserData) {
                // if the user is created by users.register(), use id: 1 as the creator for now
                if (options.include) {
                    options.include = prepareInclude(options.include);
                }

                if (options.context.internal) {
                    options.context.user = 1;
                }

                return dataProvider.User.add(checkedUserData.users[0], options);
            }).then(function (result) {
                if (result) {
                    return { users: [result.toJSON()]};
                }
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to add a users.'));
        });
    },
    /**
     * ### Destroy
     * @param {{id, context}} options
     * @returns {Promise(User)}
     */
    destroy: function destroy(options) {
        return canThis(options.context).remove.user(options.id).then(function () {
            return users.read(options).then(function (result) {
                return dataProvider.User.destroy(options).then(function () {
                    return result;
                });
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to remove the user.'));
        });
    },

    /**
     * ### Invite user
     * @param {User} object the user to create
     * @returns {Promise(User}} Newly created user
     */
    invite: function invite(object, options) {
        var newUser,
            user;

        return canThis(options.context).add.user().then(function () {
            return utils.checkObject(object, docName).then(function (checkedUserData) {
                if (options.include) {
                    options.include = prepareInclude(options.include);
                }

                newUser = checkedUserData.users[0];

                if (newUser.email) {
                    newUser.name = object.users[0].email.substring(0, newUser.email.indexOf("@"));
                    newUser.password = globalUtils.uid(50);
                    newUser.status = 'invited';
                    // TODO: match user role with db and enforce permissions
                    newUser.role = 3;
                } else {
                    return when.reject(new errors.BadRequestError('No email provided.'));
                }
            }).then(function () {
                return dataProvider.User.getByEmail(newUser.email);
            }).then(function (foundUser) {
                if (!foundUser) {
                    return dataProvider.User.add(newUser, options);
                } else {
                    // only invitations for already invited users are resent
                    if (foundUser.toJSON().status === 'invited') {
                        return foundUser;
                    } else {
                        return when.reject(new errors.BadRequestError('User is already registered.'));
                    }
                }
            }).then(function (invitedUser) {
                user = invitedUser.toJSON();
                return settings.read({context: {internal: true}, key: 'dbHash'});
            }).then(function (response) {
                var expires = Date.now() + (14 * ONE_DAY),
                    dbHash = response.settings[0].value;
                return dataProvider.User.generateResetToken(user.email, expires, dbHash);
            }).then(function (resetToken) {
                var baseUrl = config().forceAdminSSL ? (config().urlSSL || config().url) : config().url,
                    siteLink = '<a href="' + baseUrl + '">' + baseUrl + '</a>',
                    resetUrl = baseUrl.replace(/\/$/, '') +  '/ghost/signup/' + resetToken + '/',
                    resetLink = '<a href="' + resetUrl + '">' + resetUrl + '</a>',
                    payload = {
                        mail: [{
                            message: {
                                to: user.email,
                                subject: 'Invitation',
                                html: '<p><strong>Hello!</strong></p>' +
                                    '<p>You have been invited to ' + siteLink + '.</p>' +
                                    '<p>Please follow the link to sign up and publish your ideas:<br><br>' + resetLink + '</p>' +
                                    '<p>Ghost</p>'
                            },
                            options: {}
                        }]
                    };
                return mail.send(payload);
            }).then(function () {
                return when.resolve({users: [user]});
            }).otherwise(function (error) {
                if (error && error.type === 'EmailError') {
                    error.message = 'Error sending email: ' + error.message + ' Please check your email settings and resend the invitation.';
                }
                return when.reject(error);
            });
        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to add a users.'));
        });
    },

    /**
     * ### Register
     * Allow to register a user using the API without beeing authenticated in. Needed to set up the first user.
     * @param {User} object the user to create
     * @returns {Promise(User}} Newly created user
     */
    // TODO: remove when setup is implemented
    register: function register(object) {
        // TODO: if we want to prevent users from being created with the signup form this is the right place to do it
        return users.add(object, {context: {internal: true}});
    },

    /**
     * ### Change Password
     * @param {password} object 
     * @param {{context}} options
     * @returns {Promise(password}} success message
     */
    changePassword: function changePassword(object, options) {
        var oldPassword,
            newPassword,
            ne2Password;
        return utils.checkObject(object, 'password').then(function (checkedPasswordReset) {
            oldPassword = checkedPasswordReset.password[0].oldPassword;
            newPassword = checkedPasswordReset.password[0].newPassword;
            ne2Password = checkedPasswordReset.password[0].ne2Password;

            return dataProvider.User.changePassword(oldPassword, newPassword, ne2Password, options).then(function () {
                return when.resolve({password: [{message: 'Password changed successfully.'}]});
            }).otherwise(function (error) {
                return when.reject(new errors.UnauthorizedError(error.message));
            });
        });
    },

    // TODO: remove when old admin is removed, functionality lives now in api/authentication
    generateResetToken: function generateResetToken(email) {
        var expires = Date.now() + ONE_DAY;
        return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
            var dbHash = response.settings[0].value;
            return dataProvider.User.generateResetToken(email, expires, dbHash);
        });
    },

    // TODO: remove when old admin is removed -> not needed anymore
    validateToken: function validateToken(token) {
        return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
            var dbHash = response.settings[0].value;
            return dataProvider.User.validateToken(token, dbHash);
        });
    },

    // TODO: remove when old admin is removed, functionality lives now in api/authentication
    resetPassword: function resetPassword(token, newPassword, ne2Password) {
        return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
            var dbHash = response.settings[0].value;
            return dataProvider.User.resetPassword(token, newPassword, ne2Password, dbHash);
        });
    },

    doesUserExist: function doesUserExist() {
        return dataProvider.User.findAll().then(function (users) {
            if (users.length === 0) {
                return false;
            }
            return true;
        });
    }
};

module.exports = users;
