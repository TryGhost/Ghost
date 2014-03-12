var User,
    Users,
    _              = require('underscore'),
    uuid           = require('node-uuid'),
    when           = require('when'),
    errors         = require('../errorHandling'),
    nodefn         = require('when/node/function'),
    bcrypt         = require('bcrypt-nodejs'),
    Posts          = require('./post').Posts,
    ghostBookshelf = require('./base'),
    Role           = require('./role').Role,
    Permission     = require('./permission').Permission;


function validatePasswordLength(password) {
    try {
        ghostBookshelf.validator.check(password, "Your must be at least 8 characters long.").len(8);
    } catch (error) {
        return when.reject(error);
    }

    return when.resolve();
}

User = ghostBookshelf.Model.extend({

    tableName: 'users',

    permittedAttributes: [
        'id', 'uuid', 'name', 'slug', 'password', 'email', 'image', 'cover', 'bio', 'website', 'location',
        'accessibility', 'status', 'language', 'meta_title', 'meta_description', 'created_at', 'created_by',
        'updated_at', 'updated_by'
    ],

    validate: function () {
        ghostBookshelf.validator.check(this.get('email'), "Please enter a valid email address. That one looks a bit dodgy.").isEmail();
        ghostBookshelf.validator.check(this.get('bio'), "We're not writing a novel here! I'm afraid your bio has to stay under 200 characters.").len(0, 200);
        if (this.get('website') && this.get('website').length > 0) {
            ghostBookshelf.validator.check(this.get('website'), "Looks like your website is not actually a website. Try again?").isUrl();
        }
        return true;
    },

    creating: function () {
        var self = this;

        ghostBookshelf.Model.prototype.creating.call(this);

        if (!this.get('slug')) {
            // Generating a slug requires a db call to look for conflicting slugs
            return this.generateSlug(User, this.get('name'))
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
    },

    saving: function () {

        this.set('name', this.sanitize('name'));
        this.set('email', this.sanitize('email'));
        this.set('location', this.sanitize('location'));
        this.set('website', this.sanitize('website'));
        this.set('bio', this.sanitize('bio'));

        return ghostBookshelf.Model.prototype.saving.apply(this, arguments);
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
            return ghostBookshelf.Model.add.call(self, userData);
        }).then(function (addedUser) {
            // Assign the userData to our created user so we can pass it back
            userData = addedUser;
            // Add this user to the admin role (assumes admin = role_id: 1)
            return userData.roles().attach(1);
        }).then(function (addedUserRole) {
            // Return the added user as expected

            return when.resolve(userData);
        });

        /**
         * Temporarily replacing the function below with another one that checks
         * whether there's anyone registered at all. This is due to #138
         * @author  javorszky
         */

        // return this.forge({email: userData.email}).fetch().then(function (user) {
        //     if (user !== null) {
        //         return when.reject(new Error('A user with that email address already exists.'));
        //     }
        //     return nodefn.call(bcrypt.hash, _user.password, null, null).then(function (hash) {
        //         userData.password = hash;
        //         ghostBookshelf.Model.add.call(UserRole, userRoles);
        //         return ghostBookshelf.Model.add.call(User, userData);
        //     }, errors.logAndThrowError);
        // }, errors.logAndThrowError);

    },

    // Finds the user by email, and checks the password
    check: function (_userdata) {
        return this.forge({
            email: _userdata.email
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

        return this.forge({email: email}).fetch({require: true}).then(function (_user) {
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

Users = ghostBookshelf.Collection.extend({
    model: User
});

module.exports = {
    User: User,
    Users: Users
};
