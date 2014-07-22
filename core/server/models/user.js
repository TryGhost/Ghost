var _              = require('lodash'),
    when           = require('when'),
    errors         = require('../errors'),
    nodefn         = require('when/node'),
    bcrypt         = require('bcryptjs'),
    ghostBookshelf = require('./base'),
    http           = require('http'),
    crypto         = require('crypto'),
    validator      = require('validator'),
    Role           = require('./role').Role,

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

    // Get the user from the options object
    contextUser: function (options) {
        // Default to context user
        if (options.context && options.context.user) {
            return options.context.user;
            // Other wise use the internal override
        } else if (options.context && options.context.internal) {
            return 1;
            // This is the user object, so try using this user's id
        } else if (this.get('id')) {
            return this.get('id');
        } else {
            errors.logAndThrowError(new Error('missing context'));
        }
    },

    toJSON: function (options) {
        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);
        // remove password hash for security reasons
        delete attrs.password;

        return attrs;
    },

    posts: function () {
        return this.hasMany('Posts', 'created_by');
    },

    roles: function () {
        return this.belongsToMany('Role');
    },

    permissions: function () {
        return this.belongsToMany('Permission');
    }

}, {
    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function (methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['withRelated'],
                findAll: ['withRelated'],
                setup: ['id'],
                edit: ['withRelated', 'id'],
                findPage: ['page', 'limit', 'status']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * ### Find All
     *
     * @param options
     * @returns {*}
     */
    findAll:  function (options) {
        options = options || {};
        options.withRelated = _.union([ 'roles' ], options.include);
        return ghostBookshelf.Model.findAll.call(this, options);
    },

    /**
     * #### findPage
     * Find results by page - returns an object containing the
     * information about the request (page, limit), along with the
     * info needed for pagination (pages, total).
     *
     * **response:**
     *
     *     {
     *         users: [
     *              {...}, {...}, {...}
     *          ],
     *          meta: {
     *              page: __,
     *              limit: __,
     *              pages: __,
     *              total: __
     *         }
     *     }
     *
     * @params {Object} options
     */
    findPage: function (options) {
        options = options || {};

        var userCollection = Users.forge(),
            userQuery;

        if (options.limit && options.limit !== 'all') {
            options.limit = parseInt(options.limit) || 15;
        }

        options = this.filterOptions(options, 'findPage');

        // Set default settings for options
        options = _.extend({
            page: 1, // pagination page
            limit: 15,
            status: 'active',
            where: {}
        }, options);

        //TODO: there are multiple statuses that make a user "active" or "invited" - we a way to translate/map them:
            //TODO (cont'd from above): * valid "active" statuses: active, warn-1, warn-2, warn-3, warn-4, locked
            //TODO (cont'd from above): * valid "invited" statuses" invited, invited-pending

        // the status provided.
        if (options.status) {
            // make sure that status is valid
            //TODO: need a better way of getting a list of statuses other than hard-coding them...
            options.status = _.indexOf(['active', 'warn-1', 'warn-2', 'warn-3', 'locked', 'invited'], options.status) !== -1 ? options.status : 'active';
            options.where.status = options.status;
        }

        // If there are where conditionals specified, add those
        // to the query.
        if (options.where) {
            userCollection.query('where', options.where);
        }

        // Add related objects
        options.withRelated = _.union([ 'roles' ], options.include);

        //only include a limit-query if a numeric limit is provided
        if (_.isNumber(options.limit)) {
            userCollection
                .query('limit', options.limit)
                .query('offset', options.limit * (options.page - 1));
        }

        userQuery = userCollection
            .query('orderBy', 'last_login', 'DESC')
            .query('orderBy', 'name', 'ASC')
            .query('orderBy', 'created_at', 'DESC')
            .fetch(_.omit(options, 'page', 'limit'));


        return when(userQuery)

            // Fetch pagination information
            .then(function () {
                var qb,
                    tableName = _.result(userCollection, 'tableName'),
                    idAttribute = _.result(userCollection, 'idAttribute');

                // After we're done, we need to figure out what
                // the limits are for the pagination values.
                qb = ghostBookshelf.knex(tableName);

                if (options.where) {
                    qb.where(options.where);
                }

                return qb.count(tableName + '.' + idAttribute + ' as aggregate');
            })

            // Format response of data
            .then(function (resp) {
                var totalUsers = parseInt(resp[0].aggregate, 10),
                    calcPages = Math.ceil(totalUsers / options.limit),
                    pagination = {},
                    meta = {},
                    data = {};

                pagination.page = parseInt(options.page, 10);
                pagination.limit = options.limit;
                pagination.pages = calcPages === 0 ? 1 : calcPages;
                pagination.total = totalUsers;
                pagination.next = null;
                pagination.prev = null;

                // Pass include to each model so that toJSON works correctly
                if (options.include) {
                    _.each(userCollection.models, function (item) {
                        item.include = options.include;
                    });
                }

                data.users = userCollection.toJSON();
                data.meta = meta;
                meta.pagination = pagination;

                if (pagination.pages > 1) {
                    if (pagination.page === 1) {
                        pagination.next = pagination.page + 1;
                    } else if (pagination.page === pagination.pages) {
                        pagination.prev = pagination.page - 1;
                    } else {
                        pagination.next = pagination.page + 1;
                        pagination.prev = pagination.page - 1;
                    }
                }

                return data;
            })
            .catch(errors.logAndThrowError);
    },

    /**
     * ### Find One
     * @extends ghostBookshelf.Model.findOne to include roles
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function (data, options) {
        options = options || {};
        options.withRelated = _.union([ 'roles' ], options.include);

        // Support finding by role
        if (data.role) {
            options.withRelated = [{
                'roles': function (qb) {
                    qb.where('name', data.role);
                }
            }];
            delete data.role;
        }

        return ghostBookshelf.Model.findOne.call(this, data, options);
    },

    /**
     * ### Edit
     * @extends ghostBookshelf.Model.edit to handle returning the full object
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function (data, options) {
        var self = this,
            adminRole,
            ownerRole;

        options = options || {};
        options.withRelated = _.union([ 'roles' ], options.include);

        return ghostBookshelf.Model.edit.call(this, data, options).then(function (user) {

            if (data.roles) {

                if (user.id === options.context.user) {
                    return when.reject(new errors.ValidationError('You are not allowed to assign a new role to yourself'));
                }
                if (data.roles.length > 1) {
                    return when.reject(new errors.ValidationError('Only one role per user is supported at the moment.'));
                }

                return Role.findOne({id: data.roles[0]}).then(function (role) {
                    if (role.get('name') === 'Owner') {
                        // Get admin and owner role
                        return Role.findOne({name: 'Administrator'}).then(function (result) {
                            adminRole = result;
                            return Role.findOne({name: 'Owner'});
                        }).then(function (result) {
                            ownerRole = result;
                            return User.findOne({id: options.context.user});
                        }).then(function (contextUser) {
                            // check if user has the owner role
                            var currentRoles = contextUser.toJSON().roles;
                            if (!_.contains(currentRoles, ownerRole.id)) {
                                return when.reject(new errors.ValidationError('Only owners are able to transfer the owner role.'));
                            }
                            // convert owner to admin
                            return contextUser.roles().updatePivot({role_id: adminRole.id});
                        }).then(function () {
                            // assign owner role to a new user
                            return user.roles().updatePivot({role_id: ownerRole.id});
                        });
                    } else {
                        // assign all other roles
                        return user.roles().updatePivot({role_id: data.roles[0]});
                    }
                }).then(function () {
                    return self.findOne(user, options);
                });
            }
            return user;
        });
    },

    /**
     * ## Add
     * Naive user add
     * Hashes the password provided before saving to the database.
     *
     * @param {object} data
     * @param {object} options
     * @extends ghostBookshelf.Model.add to manage all aspects of user signup
     * **See:** [ghostBookshelf.Model.add](base.js.html#Add)
     */
    add: function (data, options) {
        var self = this,
            // Clone the _user so we don't expose the hashed password unnecessarily
            userData = this.filterData(data);

        options = this.filterOptions(options, 'add');
        options.withRelated = _.union([ 'roles' ], options.include);

        return validatePasswordLength(userData.password).then(function () {
            return self.forge().fetch();
        }).then(function () {
            // Generate a new password hash
            return generatePasswordHash(data.password);
        }).then(function (hash) {
            // Assign the hashed password
            userData.password = hash;
            // LookupGravatar
            return self.gravatarLookup(userData);
        }).then(function (userData) {
            // Save the user with the hashed password
            return ghostBookshelf.Model.add.call(self, userData, options);
        }).then(function (addedUser) {

            // Assign the userData to our created user so we can pass it back
            userData = addedUser;
            if (!data.role) {
                // TODO: needs change when owner role is introduced and setup is changed
                data.role = 1;
            }
            return userData.roles().attach(data.role);
        }).then(function (addedUserRole) {
            /*jshint unused:false*/
            // find and return the added user
            return self.findOne({id: userData.id}, options);
        });
    },

    setup: function (data, options) {
        var self = this,
            userData = this.filterData(data);

        options = this.filterOptions(options, 'setup');
        options.withRelated = _.union([ 'roles' ], options.include);

        return validatePasswordLength(userData.password).then(function () {
            // Generate a new password hash
            return generatePasswordHash(data.password);
        }).then(function (hash) {
            // Assign the hashed password
            userData.password = hash;
            // LookupGravatar
            return self.gravatarLookup(userData);
        }).then(function (userWithGravatar) {
            userData = userWithGravatar;
            // Generate a new slug
            return ghostBookshelf.Model.generateSlug.call(this, User, userData.name, options);
        }).then(function (slug) {
            // Assign slug and save the updated user
            userData.slug = slug;
            return self.edit.call(self, userData, options);
        });
    },

    permissable: function (userModelOrId, context, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            userModel = userModelOrId,
            origArgs;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(userModelOrId) || _.isString(userModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);
            // Get the actual post model
            return this.findOne({id: userModelOrId}).then(function (foundUserModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundUserModel].concat(origArgs);

                return self.permissable.apply(self, newArgs);
            }, errors.logAndThrowError);
        }

        if (userModel) {
            // If this is the same user that requests the operation allow it.
            hasUserPermission = hasUserPermission || context.user === userModel.get('id');
        }

        if (hasUserPermission && hasAppPermission) {
            return when.resolve();
        }

        return when.reject();
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
    check: function (object) {
        var self = this,
            s;
        return this.getByEmail(object.email).then(function (user) {
            if (!user || user.get('status') === 'invited' || user.get('status') === 'invited-pending'
                    || user.get('status') === 'inactive') {
                return when.reject(new errors.NotFoundError('NotFound'));
            }
            if (user.get('status') !== 'locked') {
                return nodefn.call(bcrypt.compare, object.password, user.get('password')).then(function (matched) {
                    if (!matched) {
                        return when(self.setWarning(user)).then(function (remaining) {
                            s = (remaining > 1) ? 's' : '';
                            return when.reject(new errors.UnauthorizedError('Your password is incorrect.<br>' +
                                remaining + ' attempt' + s + ' remaining!'));
                        });
                    }

                    return when(user.set({status : 'active', last_login : new Date()}).save()).then(function (user) {
                        return user;
                    });
                }, errors.logAndThrowError);
            }
            return when.reject(new errors.NoPermissionError('Your account is locked due to too many ' +
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
     * @param {object} _userdata email, old pw, new pw, new pw2
     */
    changePassword: function (oldPassword, newPassword, ne2Password, options) {
        var self = this,
            userid = options.context.user,
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
            if (!foundUser) {
                return when.reject(new Error('NotFound'));
            }

            var hash = crypto.createHash('sha256'),
                text = '';

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

            // check if the token length is correct
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

            return foundUser.save({password: passwordHash, status: 'active'});
        });
    },

    gravatarLookup: function (userData) {
        var gravatarUrl = '//www.gravatar.com/avatar/' +
                crypto.createHash('md5').update(userData.email.toLowerCase().trim()).digest('hex') +
                "?d=404&s=250",
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
        });
    }
});

Users = ghostBookshelf.Collection.extend({
    model: User
});

module.exports = {
    User: ghostBookshelf.model('User', User),
    Users: ghostBookshelf.collection('Users', Users)
};
