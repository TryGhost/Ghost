// # Users API
// RESTful API for the User resource
var Promise         = require('bluebird'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    settings        = require('./settings'),
    canThis         = require('../permissions').canThis,
    errors          = require('../errors'),
    utils           = require('./utils'),
    globalUtils     = require('../utils'),
    config          = require('../config'),
    mail            = require('./mail'),
    pipeline        = require('../utils/pipeline'),

    docName         = 'users',
    // TODO: implement created_by, updated_by
    allowedIncludes = ['permissions', 'roles', 'roles.permissions'],
    users,
    sendInviteEmail;

sendInviteEmail = function sendInviteEmail(user) {
    var emailData;

    return Promise.join(
        users.read({id: user.created_by, context: {internal: true}}),
        settings.read({key: 'title'}),
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

        emailData.resetLink = baseUrl.replace(/\/$/, '') + '/ghost/signup/' + globalUtils.encodeBase64URLsafe(resetToken) + '/';

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
 * ### Users API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
users = {
    /**
     * ## Browse
     * Fetch all users
     * @param {{context}} options (optional)
     * @returns {Promise<Users>} Users Collection
     */
    browse: function browse(options) {
        var extraOptions = ['role', 'status'],
            permittedOptions = utils.browseDefaultOptions.concat(extraOptions),
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.User.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: permittedOptions}),
            utils.handlePublicPermissions(docName, 'browse'),
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Read
     * @param {{id, context}} options
     * @returns {Promise<Users>} User
     */
    read: function read(options) {
        var attrs = ['id', 'slug', 'status', 'email', 'role'],
            tasks;

        // Special handling for id = 'me'
        if (options.id === 'me' && options.context && options.context.user) {
            options.id = options.context.user;
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.User.findOne(options.data, _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {attrs: attrs}),
            utils.handlePublicPermissions(docName, 'read'),
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(result) {
            if (result) {
                return {users: [result.toJSON(options)]};
            }

            return Promise.reject(new errors.NotFoundError('User not found.'));
        });
    },

    /**
     * ## Edit
     * @param {User} object the user details to edit
     * @param {{id, context}} options
     * @returns {Promise<User>}
     */
    edit: function edit(object, options) {
        var extraOptions = ['editRoles'],
            permittedOptions = extraOptions.concat(utils.idDefaultOptions),
            tasks;

        if (object.users && object.users[0] && object.users[0].roles && object.users[0].roles[0]) {
            options.editRoles = true;
        }

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * Edit user allows the related role object to be updated as well, with some rules:
         * - No change permitted to the role of the owner
         * - no change permitted to the role of the context user (user making the request)
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            if (options.id === 'me' && options.context && options.context.user) {
                options.id = options.context.user;
            }

            return canThis(options.context).edit.user(options.id).then(function () {
                // if roles aren't in the payload, proceed with the edit
                if (!(options.data.users[0].roles && options.data.users[0].roles[0])) {
                    return options;
                }

                // @TODO move role permissions out of here
                var role = options.data.users[0].roles[0],
                    roleId = parseInt(role.id || role, 10),
                    editedUserId = parseInt(options.id, 10);

                return dataProvider.User.findOne(
                    {id: options.context.user, status: 'all'}, {include: ['roles']}
                ).then(function (contextUser) {
                    var contextRoleId = contextUser.related('roles').toJSON(options)[0].id;

                    if (roleId !== contextRoleId && editedUserId === contextUser.id) {
                        return Promise.reject(new errors.NoPermissionError('You cannot change your own role.'));
                    }

                    return dataProvider.User.findOne({role: 'Owner'}).then(function (owner) {
                        if (contextUser.id !== owner.id) {
                            if (editedUserId === owner.id) {
                                if (owner.related('roles').at(0).id !== roleId) {
                                    return Promise.reject(new errors.NoPermissionError('Cannot change Owner\'s role.'));
                                }
                            } else if (roleId !== contextRoleId) {
                                return canThis(options.context).assign.role(role).then(function () {
                                    return options;
                                });
                            }
                        }

                        return options;
                    });
                });
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to edit this user');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.User.edit(options.data.users[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: permittedOptions}),
            handlePermissions,
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        return pipeline(tasks, object, options).then(function formatResponse(result) {
            if (result) {
                return {users: [result.toJSON(options)]};
            }

            return Promise.reject(new errors.NotFoundError('User not found.'));
        });
    },

    /**
     * ## Add user
     * The newly added user is invited to join the blog via email.
     * @param {User} object the user to create
     * @param {{context}} options
     * @returns {Promise<User>} Newly created user
     */
    add: function add(object, options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            var newUser = options.data.users[0];
            return canThis(options.context).add.user(options.data).then(function () {
                if (newUser.roles && newUser.roles[0]) {
                    var roleId = parseInt(newUser.roles[0].id || newUser.roles[0], 10);

                    // @TODO move this logic to permissible
                    // Make sure user is allowed to add a user with this role
                    return dataProvider.Role.findOne({id: roleId}).then(function (role) {
                        if (role.get('name') === 'Owner') {
                            return Promise.reject(new errors.NoPermissionError('Not allowed to create an owner user.'));
                        }

                        return canThis(options.context).assign.role(role);
                    }).then(function () {
                        return options;
                    });
                }

                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to add this user');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            var newUser = options.data.users[0],
                user;

            if (newUser.email) {
                newUser.name = newUser.email.substring(0, newUser.email.indexOf('@'));
                newUser.password = globalUtils.uid(50);
                newUser.status = 'invited';
            } else {
                return Promise.reject(new errors.BadRequestError('No email provided.'));
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
                        return Promise.reject(new errors.BadRequestError('User is already registered.'));
                    }
                }
            }).then(function (invitedUser) {
                user = invitedUser.toJSON(options);
                return sendInviteEmail(user);
            }).then(function () {
                // If status was invited-pending and sending the invitation succeeded, set status to invited.
                if (user.status === 'invited-pending') {
                    return dataProvider.User.edit(
                        {status: 'invited'}, _.extend({}, options, {id: user.id})
                    ).then(function (editedUser) {
                            user = editedUser.toJSON(options);
                        });
                }
            }).then(function () {
                return Promise.resolve({users: [user]});
            }).catch(function (error) {
                if (error && error.errorType === 'EmailError') {
                    error.message = 'Error sending email: ' + error.message + ' Please check your email settings and resend the invitation.';
                    errors.logWarn(error.message);

                    // If sending the invitation failed, set status to invited-pending
                    return dataProvider.User.edit({status: 'invited-pending'}, {id: user.id}).then(function (user) {
                        return dataProvider.User.findOne({id: user.id, status: 'all'}, options).then(function (user) {
                            return {users: [user]};
                        });
                    });
                }
                return Promise.reject(error);
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName),
            handlePermissions,
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        return pipeline(tasks, object, options);
    },

    /**
     * ## Destroy
     * @param {{id, context}} options
     * @returns {Promise<User>}
     */
    destroy: function destroy(options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).destroy.user(options.id).then(function permissionGranted() {
                options.status = 'all';
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to destroy this user.');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return users.read(options).then(function (result) {
                return dataProvider.Base.transaction(function (t) {
                    options.transacting = t;

                    Promise.all([
                        dataProvider.Accesstoken.destroyByUser(options),
                        dataProvider.Refreshtoken.destroyByUser(options),
                        dataProvider.Post.destroyByAuthor(options)
                    ]).then(function () {
                        return dataProvider.User.destroy(options);
                    }).then(function () {
                        t.commit();
                    }).catch(function (error) {
                        t.rollback(error);
                    });
                }).then(function () {
                    return result;
                }, function (error) {
                    return Promise.reject(new errors.InternalServerError(error));
                });
            }, function (error) {
                return errors.handleAPIError(error);
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            handlePermissions,
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Change Password
     * @param {password} object
     * @param {{context}} options
     * @returns {Promise<password>} success message
     */
    changePassword: function changePassword(object, options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).edit.user(options.data.password[0].user_id).then(function permissionGranted() {
                return options;
            }).catch(function (error) {
                return errors.handleAPIError(error, 'You do not have permission to change the password for this user');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.User.changePassword(
                options.data.password[0],
                _.omit(options, ['data'])
            );
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate('password'),
            handlePermissions,
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse() {
            return Promise.resolve({password: [{message: 'Password changed successfully.'}]});
        });
    },

    /**
     * ## Transfer Ownership
     * @param {owner} object
     * @param {Object} options
     * @returns {Promise<User>}
     */
    transferOwnership: function transferOwnership(object, options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return dataProvider.Role.findOne({name: 'Owner'}).then(function (ownerRole) {
                return canThis(options.context).assign.role(ownerRole);
            }).then(function () {
                return options;
            }).catch(function (error) {
                return errors.handleAPIError(error);
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.User.transferOwnership(options.data.owner[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate('owner'),
            handlePermissions,
            utils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResult(result) {
            return Promise.resolve({users: result});
        }).catch(function (error) {
            return errors.handleAPIError(error);
        });
    }
};

module.exports = users;
