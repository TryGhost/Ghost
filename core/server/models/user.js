var User,
    Users,
    UserRole,
// UserRoles,
    _ = require('underscore'),
    uuid = require('node-uuid'),
    when = require('when'),
    errors = require('../errorHandling'),
    nodefn = require('when/node/function'),
    bcrypt = require('bcrypt-nodejs'),
    Posts = require('./post').Posts,
    GhostBookshelf = require('./base'),
    Role = require('./role').Role,
    Permission = require('./permission').Permission;



UserRole = GhostBookshelf.Model.extend({
    tableName: 'roles_users'
});


User = GhostBookshelf.Model.extend({

    tableName: 'users',

    hasTimestamps: true,

    defaults: function () {
        return {
            uuid: uuid.v4()
        };
    },

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

        var self = this,
            // Clone the _user so we don't expose the hashed password unnecessarily
            userData = _.extend({}, _user);

        /**
         * This only allows one user to be added to the database, otherwise fails.
         * @param  {object} user
         * @author javorszky
         */
        return this.forge().fetch().then(function (user) {
            // Check if user exists
            if (user) {
                return when.reject(new Error('A user is already registered. Only one user for now!'));
            }

            // Hash the provided password with bcrypt
            return nodefn.call(bcrypt.hash, _user.password, null, null);
        }).then(function (hash) {
            // Assign the hashed password
            userData.password = hash;
            // Save the user with the hashed password
            return GhostBookshelf.Model.add.call(self, userData);
        }).then(function (addedUser) {
            // Assign the userData to our created user so we can pass it back
            userData = addedUser;

            // Add this user to the admin role (assumes admin = role_id: 1)
            return UserRole.add({role_id: 1, user_id: addedUser.id});
        }).then(function (addedUserRole) {
            // Return the added user as expected
            return when.resolve(userData);
        });

        /**
         * Temporarily replacing the function below with another one that checks
         * whether there's anyone registered at all. This is due to #138
         * @author  javorszky
         */

        // return this.forge({email_address: userData.email_address}).fetch().then(function (user) {
        //     if (user !== null) {
        //         return when.reject(new Error('A user with that email address already exists.'));
        //     }
        //     return nodefn.call(bcrypt.hash, _user.password, null, null).then(function (hash) {
        //         userData.password = hash;
        //         GhostBookshelf.Model.add.call(UserRole, userRoles);
        //         return GhostBookshelf.Model.add.call(User, userData);
        //     }, errors.logAndThrowError);
        // }, errors.logAndThrowError);

    },

    // Finds the user by email, and checks the password
    check: function (_userdata) {
        return this.forge({
            email_address: _userdata.email
        }).fetch({require: true}).then(function (user) {
            return nodefn.call(bcrypt.compare, _userdata.pw, user.get('password')).then(function (matched) {
                if (!matched) {
                    return when.reject(new Error('Passwords do not match'));
                }
                return user;
            }, errors.logAndThrowError);
        }, function (error) {
            return when.reject(new Error('There is no user with that email address.'));
        });
    },

    /**
     * Naive change password method
     * @param  {object} _userdata email, old pw, new pw, new pw2
     *
     */
    changePassword: function (_userdata) {
        var userid = _userdata.currentUser,
            oldPassword = _userdata.oldpw,
            newPassword = _userdata.newpw,
            ne2Password = _userdata.ne2pw;

        if (newPassword !== ne2Password) {
            return when.reject(new Error('Passwords aren\'t the same'));
        }

        return this.forge({
            id: userid
        }).fetch({require: true}).then(function (user) {
            return nodefn.call(bcrypt.compare, oldPassword, user.get('password'))
                .then(function (matched) {
                    if (!matched) {
                        return when.reject(new Error('Passwords do not match'));
                    }
                    return nodefn.call(bcrypt.hash, newPassword, null, null).then(function (hash) {
                        user.save({password: hash});
                        return user;
                    });
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
            }, errors.logAndThrowError);
    }

});

Users = GhostBookshelf.Collection.extend({
    model: User
});

module.exports = {
    User: User,
    Users: Users
};
