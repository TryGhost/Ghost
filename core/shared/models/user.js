(function () {
    "use strict";

    var User,
        Users,
        _ = require('underscore'),
        when = require('when'),
        nodefn = require('when/node/function'),
        bcrypt = require('bcrypt-nodejs'),
        Posts = require('./post').Posts,
        GhostBookshelf = require('./base'),
        Role = require('./role').Role,
        Permission = require('./permission').Permission;

    User = GhostBookshelf.Model.extend({

        tableName: 'users',

        hasTimestamps: true,

        posts: function () {
            return this.hasMany(Posts, 'created_by');
        },

        roles: function () {
            return this.belongsToMany(Role);
        },

        permissions: function () {
            return this.belongsToMany(Permission);
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

            return this.forge({email_address: userData.email_address}).fetch().then(function (user) {
                if (!!user.attributes.email_address) {
                    when.reject(new Error('A user with that email address already exists.'));
                }

                return nodefn.call(bcrypt.hash, _user.password, null, null).then(function (hash) {
                    userData.password = hash;
                    return GhostBookshelf.Model.add.call(User, userData);
                });
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
            }).fetch({require: true}).then(function (user) {
                return nodefn.call(bcrypt.compare, _userdata.pw, user.get('password')).then(function (matched) {
                    if (!matched) {
                        return when.reject(new Error('Passwords do not match'));
                    }
                    return user;
                });
            });
        },

        effectivePermissions: function (id) {
            return this.read({id: id}, { withRelated: ['permissions', 'roles.permissions'] })
                .then(function (foundUser) {
                    var seenPerms = {},
                        rolePerms = _.map(foundUser.related('roles').models, function (role) {
                            return role.related('permissions').models;
                        }),
                        allPerms = [];

                    rolePerms.push(foundUser.related('permissions').models);

                    _.each(rolePerms, function (rolePermGroup) {
                        _.each(rolePermGroup, function (perm) {
                            var key = perm.get('action_type') + '-' + perm.get('object_type') + '-' + perm.get('object_id');

                            // Only add perms once
                            if (seenPerms[key]) {
                                return;
                            }

                            allPerms.push(perm);
                            seenPerms[key] = true;
                        });
                    });

                    return when.resolve(allPerms);
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