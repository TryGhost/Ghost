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


function validatePasswordLength(password) {
    try {
        GhostBookshelf.validator.check(password, "Your password is not long enough. It must be at least 8 chars long.").len(8);
    } catch (error) {
        return when.reject(error);
    }

    return when.resolve();
}

User = GhostBookshelf.Model.extend({

    tableName: 'users',

    hasTimestamps: true,

    permittedAttributes: [
        'id', 'uuid', 'full_name', 'password', 'email_address', 'profile_picture', 'cover_picture', 'bio', 'url', 'location',
        'created_at', 'created_by', 'updated_at', 'updated_by'
    ],

    defaults: function () {
        return {
            uuid: uuid.v4()
        };
    },

    parse: function (attrs) {
        // temporary alias of name for full_name (will get changed in the schema)
        if (attrs.full_name && !attrs.name) {
            attrs.name = attrs.full_name;
        }

        // temporary alias of website for url (will get changed in the schema)
        if (attrs.url && !attrs.website) {
            attrs.website = attrs.url;
        }

        return attrs;
    },

    initialize: function () {
        this.on('saving', this.saving, this);
        this.on('saving', this.validate, this);
    },

    validate: function () {
        GhostBookshelf.validator.check(this.get('email_address'), "Please check your email address. It does not seem to be valid.").isEmail();
        GhostBookshelf.validator.check(this.get('bio'), "Your bio is too long. Please keep it to 200 chars.").len(0, 200);
        if (this.get('url') && this.get('url').length > 0) {
            GhostBookshelf.validator.check(this.get('url'), "Your website is not a valid URL.").isUrl();
        }
        return true;
    },

    saving: function () {
        // Deal with the related data here

        // Remove any properties which don't belong on the post model
        this.attributes = this.pick(this.permittedAttributes);
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
        return validatePasswordLength(userData.password).then(function () {
            return self.forge().fetch();
        }).then(function (user) {
            // Check if user exists
            if (user) {
                return when.reject(new Error('A user is already registered. Only one user for now!'));
            }
        }).then(function () {
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
                    return when.reject(new Error('Your password is incorrect'));
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
        var self = this,
            userid = _userdata.currentUser,
            oldPassword = _userdata.oldpw,
            newPassword = _userdata.newpw,
            ne2Password = _userdata.ne2pw,
            user = null;


        if (newPassword !== ne2Password) {
            return when.reject(new Error('Your new passwords do not match'));
        }

        return validatePasswordLength(newPassword).then(function () {
            return self.forge({id: userid}).fetch({require: true});
        }).then(function (_user) {
            user = _user;
            return nodefn.call(bcrypt.compare, oldPassword, user.get('password'));
        }).then(function (matched) {
            if (!matched) {
                return when.reject(new Error('Your password is incorrect'));
            }
            return nodefn.call(bcrypt.hash, newPassword, null, null);
        }).then(function (hash) {
            user.save({password: hash});

            return user;
        });
    },

    forgottenPassword: function (email) {
        var newPassword = Math.random().toString(36).slice(2, 12), // This is magick
            user = null;

        return this.forge({email_address: email}).fetch({require: true}).then(function (_user) {
            user = _user;
            return nodefn.call(bcrypt.hash, newPassword, null, null);
        }).then(function (hash) {
            user.save({password: hash});
            return { user: user, newPassword: newPassword };
        }, function (error) {
            return when.reject(new Error('There is no user by that email address. Check again.'));
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
