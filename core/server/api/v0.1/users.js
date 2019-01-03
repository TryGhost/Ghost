// # Users API
// RESTful API for the User resource
const Promise = require('bluebird'),
    _ = require('lodash'),
    pipeline = require('../../lib/promise/pipeline'),
    localUtils = require('./utils'),
    canThis = require('../../services/permissions').canThis,
    models = require('../../models'),
    common = require('../../lib/common'),
    {urlsForUser} = require('./decorators/urls'),
    docName = 'users',
    allowedIncludes = ['count.posts', 'permissions', 'roles', 'roles.permissions'];

let users;

/**
 * ### Users API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
 */
users = {
    /**
     * ## Browse
     * Fetch all users
     * @param {{context}} options (optional)
     * @returns {Promise<Users>} Users Collection
     */
    browse(options) {
        let extraOptions = ['status', 'absolute_urls'],
            permittedOptions = localUtils.browseDefaultOptions.concat(extraOptions),
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.User.findPage(options)
                .then(({data, meta}) => {
                    return {
                        users: data.map(model => urlsForUser(model.id, model.toJSON(options), options)),
                        meta: meta
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {opts: permittedOptions}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePublicPermissions(docName, 'browse'),
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
    read(options) {
        let attrs = ['id', 'slug', 'status', 'email', 'role'],
            permittedOptions = ['absolute_urls'],
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
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.users.userNotFound')
                        }));
                    }

                    return {
                        users: [urlsForUser(model.id, model.toJSON(options), options)]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {attrs: attrs, opts: permittedOptions}),
            localUtils.convertOptions(allowedIncludes),
            localUtils.handlePublicPermissions(docName, 'read'),
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
    edit(object, options) {
        let extraOptions = ['editRoles'],
            permittedOptions = extraOptions.concat(localUtils.idDefaultOptions),
            tasks;

        if (object.users && object.users[0] && object.users[0].roles && object.users[0].roles[0]) {
            options.editRoles = true;
        }

        // The password should never be set via this endpoint, if it is passed, ignore it
        if (object.users && object.users[0] && object.users[0].password) {
            delete object.users[0].password;
        }

        function prepare(options) {
            if (options.id === 'me' && options.context && options.context.user) {
                options.id = options.context.user;
            }

            return options;
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return models.User.edit(options.data.users[0], _.omit(options, ['data']))
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.users.userNotFound')
                        }));
                    }

                    return {
                        users: [urlsForUser(model.id, model.toJSON(options), options)]
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {opts: permittedOptions}),
            localUtils.convertOptions(allowedIncludes),
            prepare,
            localUtils.handlePermissions(docName, 'edit', ['status', 'roles']),
            doQuery
        ];

        return pipeline(tasks, object, options);
    },

    /**
     * ## Destroy
     * @param {{id, context}} options
     * @returns {Promise}
     */
    destroy(options) {
        let tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).destroy.user(options.id).then(() => {
                options.status = 'all';
                return options;
            }).catch((err) => {
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
            return models.Base.transaction((t) => {
                options.transacting = t;

                return Promise.all([
                    models.Accesstoken.destroyByUser(options),
                    models.Refreshtoken.destroyByUser(options),
                    models.Post.destroyByAuthor(options)
                ]).then(() => {
                    return models.User.destroy(options);
                }).return(null);
            }).catch((err) => {
                return Promise.reject(new common.errors.NoPermissionError({
                    err: err
                }));
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate(docName, {opts: localUtils.idDefaultOptions}),
            localUtils.convertOptions(allowedIncludes),
            handlePermissions,
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
    changePassword(object, options) {
        let tasks;

        function validateRequest() {
            return localUtils.validate('password')(object, options)
                .then((options) => {
                    let data = options.data.password[0];

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
            return canThis(options.context).edit.user(options.data.password[0].user_id).then(() => {
                return options;
            }).catch((err) => {
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
            ).then(() => {
                return Promise.resolve({
                    password: [{message: common.i18n.t('notices.api.users.pwdChangedSuccessfully')}]
                });
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            validateRequest,
            localUtils.convertOptions(allowedIncludes),
            handlePermissions,
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
    transferOwnership(object, options) {
        let tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return models.Role.findOne({name: 'Owner'}).then((ownerRole) => {
                return canThis(options.context).assign.role(ownerRole);
            }).then(() => {
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
                .then((models) => {
                    return {
                        users: models.toJSON(_.omit(options, ['data']))
                    };
                });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            localUtils.validate('owner'),
            localUtils.convertOptions(allowedIncludes),
            handlePermissions,
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options);
    }
};

module.exports = users;
