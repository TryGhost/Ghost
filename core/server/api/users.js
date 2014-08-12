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
    users,
    sendInviteEmail;

// ## Helpers
function prepareInclude(include) {
    include = _.intersection(include.split(','), allowedIncludes);
    return include;
}

sendInviteEmail = function sendInviteEmail(user) {
    var emailData;

    return when.join(
        users.read({'id': user.created_by}),
        settings.read({'key': 'title'}),
        settings.read({context: {internal: true}, key: 'dbHash'})
    ).then(function (values) {
        var invitedBy = values[0].users[0],
            blogTitle = values[1].settings[0].value,
            expires = Date.now() + (14 * globalUtils.ONE_DAY_MS),
            dbHash = values[2].settings[0].value;

        emailData = {
            blogName: blogTitle,
            invitedByName: invitedBy.name,
            invitedByEmail: invitedBy.email
        };

        return dataProvider.User.generateResetToken(user.email, expires, dbHash);
    }).then(function (resetToken) {
        var baseUrl = config.forceAdminSSL ? (config.urlSSL || config.url) : config.url;

        emailData.resetLink = baseUrl.replace(/\/$/, '') + '/ghost/signup/' + resetToken + '/';

        return mail.generateContent({data: emailData, template: 'invite-user'});
    }).then(function (emailContent) {
        var payload = {
            mail: [{
                message: {
                    to: user.email,
                    subject: emailData.invitedByName + ' has invited you to join ' + emailData.blogName,
                    html: emailContent.html,
                    text: emailContent.text
                },
                options: {}
            }]
        };

        return mail.send(payload, {context: {internal: true}});
    });
};
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
            return errors.handleAPIError(error, 'You do not have permission to browse users.');
        });
    },

    /**
     * ### Read
     * @param {{id, context}} options
     * @returns {Promise(User)} User
     */
    read: function read(options) {
        var attrs = ['id', 'slug', 'email', 'status'],
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
                if (data.users[0].roles && data.users[0].roles[0]) {
                    var role = data.users[0].roles[0],
                        roleId = parseInt(role.id || role, 10);

                    return dataProvider.User.findOne(
                        {id: options.context.user, status: 'all'}, {include: 'roles'}
                    ).then(function (contextUser) {
                        var contextRoleId = contextUser.related('roles').toJSON()[0].id;

                        if (roleId !== contextRoleId &&
                                parseInt(options.id, 10) === parseInt(options.context.user, 10)) {
                            return when.reject(new errors.NoPermissionError('You cannot change your own role.'));
                        } else if (roleId !== contextRoleId) {
                            return canThis(options.context).assign.role(role).then(function () {
                                return editOperation();
                            });
                        }

                        return editOperation();
                    });
                }

                return editOperation();
            });
        }).catch(function (error) {
            return errors.handleAPIError(error, 'You do not have permission to edit this user');
        });
    },

    /**
     * ### Add user
     * The newly added user is invited to join the blog via email.
     * @param {User} object the user to create
     * @returns {Promise(User}} Newly created user
     */
    add: function add(object, options) {
        var addOperation,
            newUser,
            user;

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        return utils.checkObject(object, docName).then(function (data) {
            newUser = data.users[0];

            addOperation = function () {
                if (newUser.email) {
                    newUser.name = object.users[0].email.substring(0, newUser.email.indexOf('@'));
                    newUser.password = globalUtils.uid(50);
                    newUser.status = 'invited';
                } else {
                    return when.reject(new errors.BadRequestError('No email provided.'));
                }

                return dataProvider.User.getByEmail(
                    newUser.email
                ).then(function (foundUser) {
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
                    return sendInviteEmail(user);
                }).then(function () {
                    // If status was invited-pending and sending the invitation succeeded, set status to invited.
                    if (user.status === 'invited-pending') {
                        return dataProvider.User.edit(
                            {status: 'invited'}, _.extend({}, options, {id: user.id})
                        ).then(function (editedUser) {
                            user = editedUser.toJSON();
                        });
                    }
                }).then(function () {
                    return when.resolve({users: [user]});
                }).catch(function (error) {
                    if (error && error.type === 'EmailError') {
                        error.message = 'Error sending email: ' + error.message + ' Please check your email settings and resend the invitation.';
                        errors.logWarn(error.message);

                        // If sending the invitation failed, set status to invited-pending
                        return dataProvider.User.edit({status: 'invited-pending'}, {id: user.id}).then(function (user) {
                            return dataProvider.User.findOne({ id: user.id, status: 'all' }, options).then(function (user) {
                                return { users: [user] };
                            });
                        });
                    }
                    return when.reject(error);
                });
            };

            // Check permissions
            return canThis(options.context).add.user(object).then(function () {
                if (newUser.roles && newUser.roles[0]) {
                    var roleId = parseInt(newUser.roles[0].id || newUser.roles[0], 10);

                    // Make sure user is allowed to add a user with this role
                    return dataProvider.Role.findOne({id: roleId}).then(function (role) {
                        if (role.get('name') === 'Owner') {
                            return when.reject(new errors.NoPermissionError('Not allowed to create an owner user.'));
                        }

                        return canThis(options.context).assign.role(role);
                    }).then(function () {
                        return addOperation();
                    });
                }

                return addOperation();
            });

        }).catch(function (error) {
            return errors.handleAPIError(error, 'You do not have permission to add this user');
        });
    },


    /**
     * ### Destroy
     * @param {{id, context}} options
     * @returns {Promise(User)}
     */
    destroy: function destroy(options) {
        return canThis(options.context).destroy.user(options.id).then(function () {
            return users.read(_.merge(options, { status: 'all'})).then(function (result) {
                return dataProvider.Base.transaction(function (t) {
                    options.transacting = t;
                    dataProvider.Post.destroyByAuthor(options).then(function () {
                        return dataProvider.User.destroy(options);
                    }).then(function () {
                        t.commit();
                    }).catch(function (error) {
                        t.rollback(error);
                    });
                }).then(function () {
                    return result;
                }, function (error) {
                    return when.reject(new errors.InternalServerError(error));
                });
            }, function (error) {
                return errors.handleAPIError(error);
            });
        }).catch(function (error) {
            return errors.handleAPIError(error, 'You do not have permission to destroy this user');
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
    },

    /**
     *
     */
    transferOwnership: function transferOwnership(object, options) {
        return dataProvider.Role.findOne({name: 'Owner'}).then(function (ownerRole) {
            return canThis(options.context).assign.role(ownerRole);
        }).then(function () {
            return utils.checkObject(object, 'owner').then(function (checkedOwnerTransfer) {
                return dataProvider.User.transferOwnership(checkedOwnerTransfer.owner[0], options).then(function (updatedUsers) {
                    return when.resolve({ users: updatedUsers });
                }).catch(function (error) {
                    return when.reject(new errors.ValidationError(error.message));
                });
            });
        }).catch(function (error) {
            return errors.handleAPIError(error);
        });
    }
};

module.exports = users;
