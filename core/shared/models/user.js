(function () {
    "use strict";

    var User,
        Users,
        _ = require('underscore'),
        when = require('when'),
        nodefn = require('when/node/function'),
        bcrypt = require('bcrypt'),
        Posts = require('./post').Posts,
        GhostBookshelf = require('./base');

    User = GhostBookshelf.Model.extend({

        tableName: 'users',

        hasTimestamps: true,

        posts: function () {
            return this.hasMany(Posts, 'created_by');
        }

    }, {

        /**
         * Naive user add
         * @param  _user
         *
         * Hashes the password provided before saving to the database.
         */
        add: function (_user) {
            var User = this,
                // Clone the _user so we don't expose the hashed password unnecessarily
                userData = _.extend({}, _user);

            return nodefn.call(bcrypt.hash, _user.password, 10).then(function (hash) {
                userData.password = hash;
                return GhostBookshelf.Model.add.call(User, userData);
            });
        },

        /**
         * User check
         * @param  _userdata
         *
         * Finds the user by email, and check's the password
         */
        check: function (_userdata) {
            return this.forge({
                email_address: _userdata.email
            }).fetch().then(function (user) {
                return nodefn.call(bcrypt.compare, _userdata.pw, user.get('password')).then(function (matched) {
                    if (!matched) {
                        return when.reject(new Error('Password does not match'));
                    }
                    return user;
                });
            });
        }

    });

    Users = GhostBookshelf.Collection.extend({
        model: User
    });

    module.exports = {
        User: User,
        Users: Users
    };

}());