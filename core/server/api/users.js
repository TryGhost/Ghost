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
            return dataProvider.User.findPage(options);
        }).catch(function (error) {
            return errors.handleAPIError(error);
        });
    },

    /**
     * ### Read
     * @param {{id, context}} options
     * @returns {Promise(User)} User
     */
    read: function read(options) {
        var attrs = ['id', 'slug', 'email'],
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
        var editOperation;
        if (options.id === 'me' && options.context && options.context.user) {
            options.id = options.context.user;
        }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return utils.checkObject(object, docName).then(function (data) {
            // Edit operation
            editOperation = function () {
                return dataProvider.User.edit(data.users[0], options)
                    .then(function (result) {
                        if (result) {
                            return { users: [result.toJSON()]};
                        }

                        return when.reject(new errors.NotFoundError('User not found.'));
                    });
            };

            // Check permissions
            return canThis(options.context).edit.user(options.id).then(function () {
                if (data.users[0].roles) {
                    if (options.id === options.context.user) {
                        return when.reject(new errors.NoPermissionError('You cannot change your own role.'));
                    }
                    return canThis(options.context).assign.role(data.users[0].roles[0]).then(function () {
                        return editOperation();
                    });
                }

                return editOperation();

            });
        }).catch(function (error) {
            return errors.handleAPIError(error);
        });
    },

    /**
     * ### Add user
     * The newly added user is invited to join the blog via email.
     * @param {User} object the user to create
     * @returns {Promise(User}} Newly created user
     */
    add: function add(object, options) {
        var newUser,
            user,
            roleId,
            emailData;

        return canThis(options.context).add.user(object).then(function () {
            return utils.checkObject(object, docName).then(function (checkedUserData) {
                if (options.include) {
                    options.include = prepareInclude(options.include);
                }

                newUser = checkedUserData.users[0];
                roleId = parseInt(newUser.roles[0].id || newUser.roles[0], 10);

                // Make sure user is allowed to add a user with this role
                return dataProvider.Role.findOne({id: roleId}).then(function (role) {
                    if (role.get('name') === 'Owner') {
                        return when.reject(new errors.NoPermissionError('Not allowed to create an owner user.'));
                    }

                    return canThis(options.context).assign.role(role);
                }).then(function () {
                    if (newUser.email) {
                        newUser.name = object.users[0].email.substring(0, newUser.email.indexOf('@'));
                        newUser.password = globalUtils.uid(50);
                        newUser.status = 'invited';
                    } else {
                        return when.reject(new errors.BadRequestError('No email provided.'));
                    }
                }).catch(function () {
                    return when.reject(new errors.NoPermissionError('Not allowed to create user with that role.'));
                });
            }).then(function () {
                return dataProvider.User.getByEmail(newUser.email);
            }).then(function (foundUser) {
                if (!foundUser) {
                    return dataProvider.User.add(newUser, options);
                } else {
                    // only invitations for already invited users are resent
                    if (foundUser.get('status') === 'invited' || foundUser.get('status') === 'invited-pending') {
                        return foundUser;
                    } else {
                        return when.reject(new errors.BadRequestError('User is already registered.'));
                    }
                }
            }).then(function (invitedUser) {
                user = invitedUser.toJSON();
                return settings.read({context: {internal: true}, key: 'dbHash'});
            }).then(function (response) {
                var expires = Date.now() + (14 * globalUtils.ONE_DAY_MS),
                    dbHash = response.settings[0].value;
                return dataProvider.User.generateResetToken(user.email, expires, dbHash);
            }).then(function (resetToken) {
                return when.join(users.read({'id': user.created_by}), settings.read({'key': 'title'})).then(function (values) {
                    var invitedBy = values[0].users[0],
                        blogTitle = values[1].settings[0].value,
                        baseUrl = config.forceAdminSSL ? (config.urlSSL || config.url) : config.url,
                        resetUrl = baseUrl.replace(/\/$/, '') + '/ghost/signup/' + resetToken + '/';

                    emailData = {
                        blogName: blogTitle,
                        invitedByName: invitedBy.name,
                        invitedByEmail: invitedBy.email,
                        resetLink: resetUrl
                    };

                    return mail.generateContent({data: emailData, template: 'invite-user'});
                }).then(function (emailContent) {
                    var payload = {
                        mail: [
                            {
                                message: {
                                    to: user.email,
                                    subject: emailData.invitedByName + ' has invited you to join ' + emailData.blogName,
                                    html: emailContent.html,
                                    text: emailContent.text
                                },
                                options: {}
                            }
                        ]
                    };
                    return mail.send(payload, {context: {internal: true}}).then(function () {
                        // If status was invited-pending and sending the invitation succeeded, set status to invited.
                        if (user.status === 'invited-pending') {
                            return dataProvider.User.edit({status: 'invited'}, {id: user.id}).then(function (editedUser) {
                                user = editedUser.toJSON();
                            });
                        }
                    });
                });
            }).then(function () {
                return when.resolve({users: [user]});
            }).catch(function (error) {
                if (error && error.type === 'EmailError') {
                    error.message = 'Error sending email: ' + error.message + ' Please check your email settings and resend the invitation.';
                    errors.logWarn(error.message);

                    // If sending the invitation failed, set status to invited-pending
                    return dataProvider.User.edit({status: 'invited-pending'}, {id: user.id}).then(function (user) {
                        return dataProvider.User.findOne({ id: user.id }, options).then(function (user) {
                            return { users: [user] };
                        });
                    });
                }
                return when.reject(error);
            });
        }).catch(function (error) {
            return errors.handleAPIError(error);
        });
    },


    /**
     * ### Destroy
     * @param {{id, context}} options
     * @returns {Promise(User)}
     */
    destroy: function destroy(options) {
        return canThis(options.context).destroy.user(options.id).then(function () {
            return users.read(options).then(function (result) {
                return dataProvider.User.destroy(options).then(function () {
                    return result;
                });
            });
        }).catch(function (error) {
            return errors.handleAPIError(error);
        });
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
            }).catch(function (error) {
                return when.reject(new errors.ValidationError(error.message));
            });
        });
    }

};

module.exports = users;
