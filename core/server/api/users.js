// # Users API
// RESTful API for the User resource
var when            = require('when'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    settings        = require('./settings'),
    canThis         = require('../permissions').canThis,
    errors          = require('../errors'),
    utils           = require('./utils'),

    docName         = 'users',
    ONE_DAY         = 86400000,
    users;


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
    add: function add(object, options) {
        options = options || {};

        return canThis(options.context).add.user().then(function () {
            return utils.checkObject(object, docName).then(function (checkedUserData) {
                // if the user is created by users.register(), use id: 1 as the creator for now
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

    // TODO complete documentation as part of #2822
    register: function register(object) {
        // TODO: if we want to prevent users from being created with the signup form this is the right place to do it
        return users.add(object, {context: {internal: true}});
    },


    check: function check(object) {
        return dataProvider.User.check(object);
    },

    changePassword: function changePassword(object) {
        return dataProvider.User.changePassword(object);
    },

    generateResetToken: function generateResetToken(email) {
        var expires = Date.now() + ONE_DAY;
        return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
            var dbHash = response.settings[0].value;
            return dataProvider.User.generateResetToken(email, expires, dbHash);
        });
    },

    validateToken: function validateToken(token) {
        return settings.read({context: {internal: true}, key: 'dbHash'}).then(function (response) {
            var dbHash = response.settings[0].value;
            return dataProvider.User.validateToken(token, dbHash);
        });
    },

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
