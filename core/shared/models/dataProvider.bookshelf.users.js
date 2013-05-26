(function() {
    "use strict";

    var util = require('util'),
        _ = require('underscore'),
        bcrypt = require('bcrypt'),
        models = require('./models.js'),
        BaseProvider = require('./dataProvider.bookshelf.base.js'),
        UsersProvider;

    /**
     * The Users data provider implementation for Bookshelf.
     */
    UsersProvider = function () {
        BaseProvider.call(this, models.User, models.Users);
    };

    util.inherits(UsersProvider, BaseProvider);

    /**
     * Naive user add
     * @param  _user
     * @param  callback
     *
     * Hashes the password provided before saving to the database.
     */
    UsersProvider.prototype.add = function (_user, callback) {
        var self = this,
            // Clone the _user so we don't expose the hashed password unnecessarily
            userData = _.extend({}, _user);

        this._hashPassword(userData.password, function (err, hash) {
            if (err) {
                return callback(err);
            }

            userData.password = hash;

            BaseProvider.prototype.add.call(self, userData, function (err, createdUser) {
                if (err) {
                    return callback(err);
                }

                callback(null, createdUser);
            });
        });
    };

    UsersProvider.prototype._hashPassword = function (password, callback) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return callback(err);
            }

            bcrypt.hash(password, salt, function (err, hash) {
                if (err) {
                    return callback(err);
                }

                callback(null, hash);
            });
        });
    };

    UsersProvider.prototype.check = function (_userdata, callback) {
        var test = {
            email_address: _userdata.email
        };

        this.model.forge(test).fetch().then(function (user) {
            var _user;
            bcrypt.compare(_userdata.pw, user.attributes.password, function (err, res) {
                if (err) {
                    return callback(err);
                }
                if (res) {
                    _user = user;
                } else {
                    _user = false;
                }
                callback(null, _user);
            });
        });
    };

    module.exports = UsersProvider;
}());