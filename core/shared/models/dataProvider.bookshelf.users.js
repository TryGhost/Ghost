(function() {
    "use strict";

    var util = require('util'),
        _ = require('underscore'),
        bcrypt = require('bcrypt'),
        models = require('./models.js'),
        when = require('when'),
        nodefn = require('when/node/function'),
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
     *
     * Hashes the password provided before saving to the database.
     */
    UsersProvider.prototype.add = function (_user) {
        var self = this,
            // Clone the _user so we don't expose the hashed password unnecessarily
            userData = _.extend({}, _user);

        return nodefn.call(bcrypt.hash, _user.password, 10).then(function(hash) {
            userData.password = hash;
            return BaseProvider.prototype.add.call(self, userData);
        });
    };

    /**
     * User check
     * @param  _userdata
     *
     * Finds the user by email, and check's the password
     */
    UsersProvider.prototype.check = function (_userdata) {
        console.log('just checking', _userdata);
        return this.model.forge({
            email_address: _userdata.email
        }).fetch().then(function (user) {
            return nodefn.call(bcrypt.compare, _userdata.pw, user.get('password')).then(function(matched) {
                if (!matched) return when.reject(new Error('Password does not match'));
                return user;
            });
        });
    };

    module.exports = UsersProvider;
}());