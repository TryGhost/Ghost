// # Users API
// RESTful API for the User resource
var Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../utils/pipeline'),
    apiUtils = require('./utils'),
    canThis = require('../permissions').canThis,
    models = require('../models'),
    common = require('../lib/common'),
    docName = 'users',
    // TODO: implement created_by, updated_by
    allowedIncludes = ['count.posts', 'permissions', 'roles', 'roles.permissions'],
    users;

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
        var extraOptions = ['status'],
            permittedOptions = apiUtils.browseDefaultOptions.concat(extraOptions),
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.User.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate(docName, {opts: permittedOptions}),
            apiUtils.handlePublicPermissions(docName, 'browse'),
            apiUtils.convertOptions(allowedIncludes),
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

        // Special handling for /users/me request
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
            return models.User.findOne(options.data, _.omit(options, ['data']))
                .then(function onModelResponse(model) {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.users.userNotFound')
                        }));
                    }

                    return {
                        users: [model.toJSON(options)]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate(docName, {attrs: attrs}),
            apiUtils.handlePublicPermissions(docName, 'read'),
            apiUtils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Edit
     * @param {User} object the user details to edit
     * @param {{id, context}} options
     * @returns {Promise<User>}
     */
    edit: function edit(object, options) {
        var extraOptions = ['editRoles'],
            permittedOptions = extraOptions.concat(apiUtils.idDefaultOptions),
            tasks;

        if (object.users && object.users[0] && object.users[0].roles && object.users[0].roles[0]) {
            options.editRoles = true;
        }

        // The password should never be set via this endpoint, if it is passed, ignore it
        if (object.users && object.users[0] && object.users[0].password) {
            delete object.users[0].password;
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
                // CASE: can't edit my own status to inactive or locked
                if (options.id === options.context.user) {
                    if (models.User.inactiveStates.indexOf(options.data.users[0].status) !== -1) {
                        return Promise.reject(new common.errors.NoPermissionError({
                            message: common.i18n.t('errors.api.users.cannotChangeStatus')
                        }));
                    }
                }

                // CASE: if roles aren't in the payload, proceed with the edit
                if (!(options.data.users[0].roles && options.data.users[0].roles[0])) {
                    return options;
                }

                // @TODO move role permissions out of here
                var role = options.data.users[0].roles[0],
                    roleId = role.id || role,
                    editedUserId = options.id;

                return models.User.findOne(
                    {id: options.context.user, status: 'all'}, {include: ['roles']}
                ).then(function (contextUser) {
                    var contextRoleId = contextUser.related('roles').toJSON(options)[0].id;

                    if (roleId !== contextRoleId && editedUserId === contextUser.id) {
                        return Promise.reject(new common.errors.NoPermissionError({
                            message: common.i18n.t('errors.api.users.cannotChangeOwnRole')
                        }));
                    }

                    return models.User.findOne({role: 'Owner'}).then(function (owner) {
                        if (contextUser.id !== owner.id) {
                            if (editedUserId === owner.id) {
                                if (owner.related('roles').at(0).id !== roleId) {
                                    return Promise.reject(new common.errors.NoPermissionError({
                                        message: common.i18n.t('errors.api.users.cannotChangeOwnersRole')
                                    }));
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
            }).catch(function handleError(err) {
                return Promise.reject(new common.errors.NoPermissionError({
                    err: err,
                    context: common.i18n.t('errors.api.users.noPermissionToEditUser')
                }));
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.User.edit(options.data.users[0], _.omit(options, ['data']))
                .then(function onModelResponse(model) {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.users.userNotFound')
                        }));
                    }

                    return {
                        users: [model.toJSON(options)]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate(docName, {opts: permittedOptions}),
            handlePermissions,
            apiUtils.convertOptions(allowedIncludes),
            doQuery
        ];

        return pipeline(tasks, object, options);
    },

    /**
     * ## Destroy
     * @param {{id, context}} options
     * @returns {Promise}
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
            }).catch(function handleError(err) {
                return Promise.reject(new common.errors.NoPermissionError({
                    err: err,
                    context: common.i18n.t('errors.api.users.noPermissionToDestroyUser')
                }));
            });
        }

        /**
         * ### Delete User
         * Make the call to the Model layer
         * @param {Object} options
         */
        function deleteUser(options) {
            return models.Base.transaction(function (t) {
                options.transacting = t;

                return Promise.all([
                    models.Accesstoken.destroyByUser(options),
                    models.Refreshtoken.destroyByUser(options),
                    models.Post.destroyByAuthor(options)
                ]).then(function () {
                    return models.User.destroy(options);
                }).return(null);
            }).catch(function (err) {
                return Promise.reject(new common.errors.NoPermissionError({
                    err: err
                }));
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate(docName, {opts: apiUtils.idDefaultOptions}),
            handlePermissions,
            apiUtils.convertOptions(allowedIncludes),
            deleteUser
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

        function validateRequest() {
            return apiUtils.validate('password')(object, options)
                .then(function (options) {
                    var data = options.data.password[0];

                    if (data.newPassword !== data.ne2Password) {
                        return Promise.reject(new common.errors.ValidationError({
                            message: common.i18n.t('errors.models.user.newPasswordsDoNotMatch')
                        }));
                    }

                    return Promise.resolve(options);
                });
        }

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).edit.user(options.data.password[0].user_id).then(function permissionGranted() {
                return options;
            }).catch(function (err) {
                return Promise.reject(new common.errors.NoPermissionError({
                    err: err,
                    context: common.i18n.t('errors.api.users.noPermissionToChangeUsersPwd')
                }));
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.User.changePassword(
                options.data.password[0],
                _.omit(options, ['data'])
            ).then(function onModelResponse() {
                return Promise.resolve({
                    password: [{message: common.i18n.t('notices.api.users.pwdChangedSuccessfully')}]
                });
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            validateRequest,
            handlePermissions,
            apiUtils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options);
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
            return models.Role.findOne({name: 'Owner'}).then(function (ownerRole) {
                return canThis(options.context).assign.role(ownerRole);
            }).then(function () {
                return options;
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.User.transferOwnership(options.data.owner[0], _.omit(options, ['data']))
                .then(function onModelResponse(model) {
                    // NOTE: model returns json object already
                    // @TODO: why?
                    return {
                        users: model
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            apiUtils.validate('owner'),
            handlePermissions,
            apiUtils.convertOptions(allowedIncludes),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options);
    }
};

module.exports = users;
