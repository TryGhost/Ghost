var when               = require('when'),
    _                  = require('lodash'),
    dataProvider       = require('../models'),
    settings           = require('./settings'),
    canThis            = require('../permissions').canThis,
    ONE_DAY            = 86400000,
    filteredAttributes = ['password', 'created_by', 'updated_by', 'last_login'],
    users;

// ## Users
users = {

    // #### Browse
    // **takes:** options object
    browse: function browse(options) {
        // **returns:** a promise for a collection of users in a json object
        return canThis(this.user).browse.user().then(function () {
            return dataProvider.User.browse(options).then(function (result) {
                var i = 0,
                    omitted = {};

                if (result) {
                    omitted = result.toJSON();
                }

                for (i = 0; i < omitted.length; i = i + 1) {
                    omitted[i] = _.omit(omitted[i], filteredAttributes);
                }

                return omitted;
            });
        }, function () {
            return when.reject({code: 403, message: 'You do not have permission to browse users.'});
        });
    },

    // #### Read
    // **takes:** an identifier (id or slug?)
    read: function read(args) {
        // **returns:** a promise for a single user in a json object
        if (args.id === 'me') {
            args = {id: this.user};
        }

        return dataProvider.User.read(args).then(function (result) {
            if (result) {
                var omitted = _.omit(result.toJSON(), filteredAttributes);
                return omitted;
            }

            return when.reject({code: 404, message: 'User not found'});
        });
    },

    // #### Edit
    // **takes:** a json object representing a user
    edit: function edit(userData) {
        // **returns:** a promise for the resulting user in a json object
        var self = this;
        userData.id = this.user;
        return canThis(this.user).edit.user(userData.id).then(function () {
            return dataProvider.User.edit(userData, {user: self.user}).then(function (result) {
                if (result) {
                    var omitted = _.omit(result.toJSON(), filteredAttributes);
                    return omitted;
                }
                return when.reject({code: 404, message: 'User not found'});
            });
        }, function () {
            return when.reject({code: 403, message: 'You do not have permission to edit this users.'});
        });
    },

    // #### Add
    // **takes:** a json object representing a user
    add: function add(userData) {
        // **returns:** a promise for the resulting user in a json object
        var self = this;
        return canThis(this.user).add.user().then(function () {
            // if the user is created by users.register(), use id: 1
            // as the creator for now
            if (self.user === 'internal') {
                self.user = 1;
            }
            return dataProvider.User.add(userData, {user: self.user});
        }, function () {
            return when.reject({code: 403, message: 'You do not have permission to add a users.'});
        });
    },

    // #### Register
    // **takes:** a json object representing a user
    register: function register(userData) {
        // TODO: if we want to prevent users from being created with the signup form
        // this is the right place to do it
        return users.add.call({user: 'internal'}, userData);
    },

    // #### Check
    // Checks a password matches the given email address

    // **takes:** a json object representing a user
    check: function check(userData) {
        // **returns:** on success, returns a promise for the resulting user in a json object
        return dataProvider.User.check(userData);
    },

    // #### Change Password
    // **takes:** a json object representing a user
    changePassword: function changePassword(userData) {
        // **returns:** on success, returns a promise for the resulting user in a json object
        return dataProvider.User.changePassword(userData);
    },

    generateResetToken: function generateResetToken(email) {
        var expires = Date.now() + ONE_DAY;
        return settings.read('dbHash').then(function (dbHash) {
            return dataProvider.User.generateResetToken(email, expires, dbHash);
        });
    },

    validateToken: function validateToken(token) {
        return settings.read('dbHash').then(function (dbHash) {
            return dataProvider.User.validateToken(token, dbHash);
        });
    },

    resetPassword: function resetPassword(token, newPassword, ne2Password) {
        return settings.read('dbHash').then(function (dbHash) {
            return dataProvider.User.resetPassword(token, newPassword, ne2Password, dbHash);
        });
    },

    doesUserExist: function doesUserExist() {
        return dataProvider.User.browse().then(function (users) {
            if (users.length === 0) {
                return false;
            }
            return true;
        });
    }
};

module.exports = users;
module.exports.filteredAttributes = filteredAttributes;