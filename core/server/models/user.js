var _              = require('lodash'),
    when           = require('when'),
    errors         = require('../errorHandling'),
    nodefn         = require('when/node/function'),
    bcrypt         = require('bcryptjs'),
    Posts          = require('./post').Posts,
    ghostBookshelf = require('./base'),
    Role           = require('./role').Role,
    Permission     = require('./permission').Permission,
    http           = require('http'),
    crypto         = require('crypto'),
    validator      = require('validator'),

    tokenSecurity  = {},
    User,
    Users;

function validatePasswordLength(password) {
    try {
        if (!validator.isLength(password, 8)) {
            throw new Error('Your password must be at least 8 characters long.');
        }
    } catch (error) {
        return when.reject(error);
    }
    return when.resolve();
}

function generatePasswordHash(password) {
    // Generate a new salt
    return nodefn.call(bcrypt.genSalt).then(function (salt) {
        // Hash the provided password with bcrypt
        return nodefn.call(bcrypt.hash, password, salt);
    });
}

User = ghostBookshelf.Model.extend({

    tableName: 'users',

    saving: function (newPage, attr, options) {
          /*jshint unused:false*/

        var self = this;
        // disabling sanitization until we can implement a better version
        // this.set('name', this.sanitize('name'));
        // this.set('email', this.sanitize('email'));
        // this.set('location', this.sanitize('location'));
        // this.set('website', this.sanitize('website'));
        // this.set('bio', this.sanitize('bio'));

        ghostBookshelf.Model.prototype.saving.apply(this, arguments);

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Generating a slug requires a db call to look for conflicting slugs
            return ghostBookshelf.Model.generateSlug(User, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
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
            // Generate a new password hash
            return generatePasswordHash(_user.password);
        }).then(function (hash) {
            // Assign the hashed password
            userData.password = hash;
            // LookupGravatar
            return self.gravatarLookup(userData);
        }).then(function (userData) {
            // Save the user with the hashed password
            return ghostBookshelf.Model.add.call(self, userData);
        }).then(function (addedUser) {
            // Assign the userData to our created user so we can pass it back
            userData = addedUser;
            // Add this user to the admin role (assumes admin = role_id: 1)
            return userData.roles().attach(1);
        }).then(function (addedUserRole) {
            /*jshint unused:false*/
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

    setWarning: function (user) {
        var status = user.get('status'),
            regexp = /warn-(\d+)/i,
            level;

        if (status === 'active') {
            user.set('status', 'warn-1');
            level = 1;
        } else {
            level = parseInt(status.match(regexp)[1], 10) + 1;
            if (level > 3) {
                user.set('status', 'locked');
            } else {
                user.set('status', 'warn-' + level);
            }
        }
        return when(user.save()).then(function () {
            return 5 - level;
        });
    },

    // Finds the user by email, and checks the password
    check: function (_userdata) {
        var self = this,
            s;

        return this.getByEmail(_userdata.email).then(function (user) {
            if (user.get('status') !== 'locked') {
                return nodefn.call(bcrypt.compare, _userdata.pw, user.get('password')).then(function (matched) {
                    if (!matched) {
                        return when(self.setWarning(user)).then(function (remaining) {
                            s = (remaining > 1) ? 's' : '';
                            return when.reject(new Error('Your password is incorrect.<br>' +
                                remaining + ' attempt' + s + ' remaining!'));
                        });
                    }

                    return when(user.set('status', 'active').save()).then(function (user) {
                        return user;
                    });
                }, errors.logAndThrowError);
            }
            return when.reject(new Error('Your account is locked due to too many ' +
                'login attempts. Please reset your password to log in again by clicking ' +
                'the "Forgotten password?" link!'));

        }, function (error) {
            if (error.message === 'NotFound' || error.message === 'EmptyResponse') {
                return when.reject(new Error('There is no user with that email address.'));
            }

            return when.reject(error);
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
            return nodefn.call(bcrypt.genSalt);
        }).then(function (salt) {
            return nodefn.call(bcrypt.hash, newPassword, salt);
        }).then(function (hash) {
            user.save({password: hash});

            return user;
        });
    },

    generateResetToken: function (email, expires, dbHash) {
        return this.getByEmail(email).then(function (foundUser) {
            var hash = crypto.createHash('sha256'),
                text = "";

            // Token:
            // BASE64(TIMESTAMP + email + HASH(TIMESTAMP + email + oldPasswordHash + dbHash ))

            hash.update(String(expires));
            hash.update(email.toLocaleLowerCase());
            hash.update(foundUser.get('password'));
            hash.update(String(dbHash));

            text += [expires, email, hash.digest('base64')].join('|');

            return new Buffer(text).toString('base64');
        });
    },

    validateToken: function (token, dbHash) {
        /*jslint bitwise:true*/
        // TODO: Is there a chance the use of ascii here will cause problems if oldPassword has weird characters?
        var tokenText = new Buffer(token, 'base64').toString('ascii'),
            parts,
            expires,
            email;

        parts = tokenText.split('|');

        // Check if invalid structure
        if (!parts || parts.length !== 3) {
            return when.reject(new Error("Invalid token structure"));
        }

        expires = parseInt(parts[0], 10);
        email = parts[1];

        if (isNaN(expires)) {
            return when.reject(new Error("Invalid token expiration"));
        }

        // Check if token is expired to prevent replay attacks
        if (expires < Date.now()) {
            return when.reject(new Error("Expired token"));
        }

        // to prevent brute force attempts to reset the password the combination of email+expires is only allowed for 10 attempts
        if (tokenSecurity[email + '+' + expires] && tokenSecurity[email + '+' + expires].count >= 10) {
            return when.reject(new Error("Token locked"));
        }

        return this.generateResetToken(email, expires, dbHash).then(function (generatedToken) {
            // Check for matching tokens with timing independent comparison
            var diff = 0,
                i;

            // check if the token lenght is correct
            if (token.length !== generatedToken.length) {
                diff = 1;
            }

            for (i = token.length - 1; i >= 0; i = i - 1) {
                diff |= token.charCodeAt(i) ^ generatedToken.charCodeAt(i);
            }

            if (diff === 0) {
                return when.resolve(email);
            }

            // increase the count for email+expires for each failed attempt
            tokenSecurity[email + '+' + expires] = {count: tokenSecurity[email + '+' + expires] ? tokenSecurity[email + '+' + expires].count + 1 : 1};
            return when.reject(new Error("Invalid token"));
        });
    },

    resetPassword: function (token, newPassword, ne2Password, dbHash) {
        var self = this;

        if (newPassword !== ne2Password) {
            return when.reject(new Error("Your new passwords do not match"));
        }

        return validatePasswordLength(newPassword).then(function () {
            // Validate the token; returns the email address from token
            return self.validateToken(token, dbHash);
        }).then(function (email) {
            // Fetch the user by email, and hash the password at the same time.
            return when.join(
                self.forge({email: email.toLocaleLowerCase()}).fetch({require: true}),
                generatePasswordHash(newPassword)
            );
        }).then(function (results) {
            // Update the user with the new password hash
            var foundUser = results[0],
                passwordHash = results[1];

            foundUser.save({password: passwordHash, status: 'active'});

            return foundUser;
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
    },

    gravatarLookup: function (userData) {
        var gravatarUrl = '//www.gravatar.com/avatar/' +
                            crypto.createHash('md5').update(userData.email.toLowerCase().trim()).digest('hex') +
                            "?d=404",
            checkPromise = when.defer();

        http.get('http:' + gravatarUrl, function (res) {
            if (res.statusCode !== 404) {
                userData.image = gravatarUrl;
            }
            checkPromise.resolve(userData);
        }).on('error', function () {
            //Error making request just continue.
            checkPromise.resolve(userData);
        });

        return checkPromise.promise;
    },

    // Get the user by email address, enforces case insensitivity rejects if the user is not found
    // When multi-user support is added, email addresses must be deduplicated with case insensitivity, so that
    // joe@bloggs.com and JOE@BLOGGS.COM cannot be created as two separate users.
    getByEmail: function (email) {
        // We fetch all users and process them in JS as there is no easy way to make this query across all DBs
        // Although they all support `lower()`, sqlite can't case transform unicode characters
        // This is somewhat mute, as validator.isEmail() also doesn't support unicode, but this is much easier / more
        // likely to be fixed in the near future.
        return Users.forge().fetch({require: true}).then(function (users) {
            var userWithEmail = users.find(function (user) {
                return user.get('email').toLowerCase() === email.toLowerCase();
            });

            if (userWithEmail) {
                return when.resolve(userWithEmail);
            }

            return when.reject(new Error('NotFound'));
        });
    }
});

Users = ghostBookshelf.Collection.extend({
    model: User
});

module.exports = {
    User: User,
    Users: Users
};
