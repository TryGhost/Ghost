var _              = require('lodash'),
    Promise        = require('bluebird'),
    errors         = require('../errors'),
    bcrypt         = require('bcryptjs'),
    ghostBookshelf = require('./base'),
    http           = require('http'),
    crypto         = require('crypto'),
    validator      = require('validator'),
    validation     = require('../data/validation'),
    config         = require('../config'),

    bcryptGenSalt  = Promise.promisify(bcrypt.genSalt),
    bcryptHash     = Promise.promisify(bcrypt.hash),
    bcryptCompare  = Promise.promisify(bcrypt.compare),

    tokenSecurity  = {},
    activeStates   = ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'],
    invitedStates  = ['invited', 'invited-pending'],
    User,
    Users;

function validatePasswordLength(password) {
    try {
        if (!validator.isLength(password, 8)) {
            throw new Error('Your password must be at least 8 characters long.');
        }
    } catch (error) {
        return Promise.reject(error);
    }
    return Promise.resolve();
}

function generatePasswordHash(password) {
    // Generate a new salt
    return bcryptGenSalt().then(function (salt) {
        // Hash the provided password with bcrypt
        return bcryptHash(password, salt);
    });
}

User = ghostBookshelf.Model.extend({

    tableName: 'users',

    saving: function (newPage, attr, options) {
        /*jshint unused:false*/

        var self = this;

        ghostBookshelf.Model.prototype.saving.apply(this, arguments);

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Generating a slug requires a db call to look for conflicting slugs
            return ghostBookshelf.Model.generateSlug(User, this.get('slug') || this.get('name'),
                {transacting: options.transacting, shortSlug: !this.get('slug')})
                .then(function (slug) {
                    self.set({slug: slug});
                });
        }
    },

    // For the user model ONLY it is possible to disable validations.
    // This is used to bypass validation during the credential check, and must never be done with user-provided data
    // Should be removed when #3691 is done
    validate: function () {
        var opts = arguments[1];
        if (opts && _.has(opts, 'validate') && opts.validate === false) {
            return;
        }
        return validation.validateSchema(this.tableName, this.toJSON());
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
    },

    hasRole: function (roleName) {
        var roles = this.related('roles');

        return roles.some(function (role) {
            return role.get('name') === roleName;
        });
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
                findOne: ['withRelated', 'status'],
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
     * @param {Object} options
     * @returns {*}
     */
    findAll:  function (options) {
        options = options || {};
        options.withRelated = _.union(['roles'], options.include);
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
     * @param {Object} options
     */
    findPage: function (options) {
        options = options || {};

        var userCollection = Users.forge(),
            roleInstance = options.role !== undefined ? ghostBookshelf.model('Role').forge({name: options.role}) : false;

        if (options.limit && options.limit !== 'all') {
            options.limit = parseInt(options.limit, 10) || 15;
        }

        if (options.page) {
            options.page = parseInt(options.page, 10) || 1;
        }

        options = this.filterOptions(options, 'findPage');

        // Set default settings for options
        options = _.extend({
            page: 1, // pagination page
            limit: 15,
            status: 'active',
            where: {},
            whereIn: {}
        }, options);

        // TODO: there are multiple statuses that make a user "active" or "invited" - we a way to translate/map them:
        // TODO (cont'd from above): * valid "active" statuses: active, warn-1, warn-2, warn-3, warn-4, locked
        // TODO (cont'd from above): * valid "invited" statuses" invited, invited-pending

        // Filter on the status.  A status of 'all' translates to no filter since we want all statuses
        if (options.status && options.status !== 'all') {
            // make sure that status is valid
            // TODO: need a better way of getting a list of statuses other than hard-coding them...
            options.status = _.indexOf(
                ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked', 'invited', 'inactive'],
                options.status) !== -1 ? options.status : 'active';
        }

        if (options.status === 'active') {
            userCollection.query().whereIn('status', activeStates);
        } else if (options.status === 'invited') {
            userCollection.query().whereIn('status', invitedStates);
        } else if (options.status !== 'all') {
            options.where.status = options.status;
        }

        // If there are where conditionals specified, add those
        // to the query.
        if (options.where) {
            userCollection.query('where', options.where);
        }

        // Add related objects
        options.withRelated = _.union(['roles'], options.include);

        // only include a limit-query if a numeric limit is provided
        if (_.isNumber(options.limit)) {
            userCollection
                .query('limit', options.limit)
                .query('offset', options.limit * (options.page - 1));
        }

        function fetchRoleQuery() {
            if (roleInstance) {
                return roleInstance.fetch();
            }
            return false;
        }

        return Promise.resolve(fetchRoleQuery())
            .then(function () {
                if (roleInstance) {
                    userCollection
                        .query('join', 'roles_users', 'roles_users.user_id', '=', 'users.id')
                        .query('where', 'roles_users.role_id', '=', roleInstance.id);
                }

                return userCollection
                    .query('orderBy', 'last_login', 'DESC')
                    .query('orderBy', 'name', 'ASC')
                    .query('orderBy', 'created_at', 'DESC')
                    .fetch(_.omit(options, 'page', 'limit'));
            })

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

                if (roleInstance) {
                    qb.join('roles_users', 'roles_users.user_id', '=', 'users.id');
                    qb.where('roles_users.role_id', '=', roleInstance.id);
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

                pagination.page = options.page;
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

                if (roleInstance) {
                    meta.filters = {};
                    if (!roleInstance.isNew()) {
                        meta.filters.roles = [roleInstance.toJSON()];
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
        var query,
            status;

        data = _.extend({
            status: 'active'
        }, data || {});

        status = data.status;
        delete data.status;

        options = options || {};
        options.withRelated = _.union(['roles'], options.include);

        // Support finding by role
        if (data.role) {
            options.withRelated = [{
                roles: function (qb) {
                    qb.where('name', data.role);
                }
            }];
            delete data.role;
        }

        // We pass include to forge so that toJSON has access
        query = this.forge(data, {include: options.include});

        data = this.filterData(data);

        if (status === 'active') {
            query.query('whereIn', 'status', activeStates);
        } else if (status === 'invited') {
            query.query('whereIn', 'status', invitedStates);
        } else if (status !== 'all') {
            query.query('where', {status: options.status});
        }

        options = this.filterOptions(options, 'findOne');
        delete options.include;

        return query.fetch(options);
    },

    /**
     * ### Edit
     * @extends ghostBookshelf.Model.edit to handle returning the full object
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function (data, options) {
        var self = this,
            roleId;

        options = options || {};
        options.withRelated = _.union(['roles'], options.include);

        return ghostBookshelf.Model.edit.call(this, data, options).then(function (user) {
            if (data.roles) {
                roleId = parseInt(data.roles[0].id || data.roles[0], 10);

                if (data.roles.length > 1) {
                    return Promise.reject(
                        new errors.ValidationError('Only one role per user is supported at the moment.')
                    );
                }

                return user.roles().fetch().then(function (roles) {
                    // return if the role is already assigned
                    if (roles.models[0].id === roleId) {
                        return;
                    }
                    return ghostBookshelf.model('Role').findOne({id: roleId});
                }).then(function (roleToAssign) {
                    if (roleToAssign && roleToAssign.get('name') === 'Owner') {
                        return Promise.reject(
                            new errors.ValidationError('This method does not support assigning the owner role')
                        );
                    } else {
                        // assign all other roles
                        return user.roles().updatePivot({role_id: roleId});
                    }
                }).then(function () {
                    options.status = 'all';
                    return self.findOne({id: user.id}, options);
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
            userData = this.filterData(data),
            roles;

        options = this.filterOptions(options, 'add');
        options.withRelated = _.union(['roles'], options.include);

        return ghostBookshelf.model('Role').findOne({name: 'Author'}, _.pick(options, 'transacting')).then(function (authorRole) {
            // Get the role we're going to assign to this user, or the author role if there isn't one
            roles = data.roles || [authorRole.get('id')];

            // check for too many roles
            if (roles.length > 1) {
                return Promise.reject(new errors.ValidationError('Only one role per user is supported at the moment.'));
            }
            // remove roles from the object
            delete data.roles;

            return validatePasswordLength(userData.password);
        }).then(function () {
            return self.forge().fetch(options);
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
            // if we are given a "role" object, only pass in the role ID in place of the full object
            roles = _.map(roles, function (role) {
                if (_.isString(role)) {
                    return parseInt(role, 10);
                } else if (_.isNumber(role)) {
                    return role;
                } else {
                    return parseInt(role.id, 10);
                }
            });

            return userData.roles().attach(roles, options);
        }).then(function () {
            // find and return the added user
            return self.findOne({id: userData.id, status: 'all'}, options);
        });
    },

    setup: function (data, options) {
        var self = this,
            userData = this.filterData(data);

        options = this.filterOptions(options, 'setup');
        options.withRelated = _.union(['roles'], options.include);
        options.shortSlug = true;

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

    permissible: function (userModelOrId, action, context, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            userModel = userModelOrId,
            origArgs;

        // If we passed in an id instead of a model, get the model then check the permissions
        if (_.isNumber(userModelOrId) || _.isString(userModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);
            // Get the actual post model
            return this.findOne({id: userModelOrId, status: 'all'}).then(function (foundUserModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundUserModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            }, errors.logAndThrowError);
        }

        if (action === 'edit') {
            // Users with the role 'Editor' and 'Author' have complex permissions when the action === 'edit'
            // We now have all the info we need to construct the permissions
            if (_.any(loadedPermissions.user.roles, {name: 'Author'})) {
                 // If this is the same user that requests the operation allow it.
                hasUserPermission = hasUserPermission || context.user === userModel.get('id');
            }

            if (_.any(loadedPermissions.user.roles, {name: 'Editor'})) {
                // If this is the same user that requests the operation allow it.
                hasUserPermission = context.user === userModel.get('id');

                // Alternatively, if the user we are trying to edit is an Author, allow it
                hasUserPermission = hasUserPermission || userModel.hasRole('Author');
            }
        }

        if (action === 'destroy') {
            // Owner cannot be deleted EVER
            if (userModel.hasRole('Owner')) {
                return Promise.reject();
            }

            // Users with the role 'Editor' have complex permissions when the action === 'destroy'
            if (_.any(loadedPermissions.user.roles, {name: 'Editor'})) {
                 // If this is the same user that requests the operation allow it.
                hasUserPermission = context.user === userModel.get('id');

                // Alternatively, if the user we are trying to edit is an Author, allow it
                hasUserPermission = hasUserPermission || userModel.hasRole('Author');
            }
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve();
        }

        return Promise.reject();
    },

    setWarning: function (user, options) {
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
        return Promise.resolve(user.save(options)).then(function () {
            return 5 - level;
        });
    },

    // Finds the user by email, and checks the password
    check: function (object) {
        var self = this,
            s;
        return this.getByEmail(object.email).then(function (user) {
            if (!user) {
                return Promise.reject(new errors.NotFoundError('There is no user with that email address.'));
            }
            if (user.get('status') === 'invited' || user.get('status') === 'invited-pending' ||
                    user.get('status') === 'inactive'
                ) {
                return Promise.reject(new Error('The user with that email address is inactive.'));
            }
            if (user.get('status') !== 'locked') {
                return bcryptCompare(object.password, user.get('password')).then(function (matched) {
                    if (!matched) {
                        return Promise.resolve(self.setWarning(user, {validate: false})).then(function (remaining) {
                            s = (remaining > 1) ? 's' : '';
                            return Promise.reject(new errors.UnauthorizedError('Your password is incorrect.<br>' +
                                remaining + ' attempt' + s + ' remaining!'));

                            // Use comma structure, not .catch, because we don't want to catch incorrect passwords
                        }, function (error) {
                            // If we get a validation or other error during this save, catch it and log it, but don't
                            // cause a login error because of it. The user validation is not important here.
                            errors.logError(
                                error,
                                'Error thrown from user update during login',
                                'Visit and save your profile after logging in to check for problems.'
                            );
                            return Promise.reject(new errors.UnauthorizedError('Your password is incorrect.'));
                        });
                    }

                    return Promise.resolve(user.set({status: 'active', last_login: new Date()}).save({validate: false}))
                        .catch(function (error) {
                            // If we get a validation or other error during this save, catch it and log it, but don't
                            // cause a login error because of it. The user validation is not important here.
                            errors.logError(
                                error,
                                'Error thrown from user update during login',
                                'Visit and save your profile after logging in to check for problems.'
                            );
                            return user;
                        });
                }, errors.logAndThrowError);
            }
            return Promise.reject(new errors.NoPermissionError('Your account is locked due to too many ' +
                'login attempts. Please reset your password to log in again by clicking ' +
                'the "Forgotten password?" link!'));
        }, function (error) {
            if (error.message === 'NotFound' || error.message === 'EmptyResponse') {
                return Promise.reject(new errors.NotFoundError('There is no user with that email address.'));
            }

            return Promise.reject(error);
        });
    },

    /**
     * Naive change password method
     * @param {String} oldPassword
     * @param {String} newPassword
     * @param {String} ne2Password
     * @param {Object} options
     */
    changePassword: function (oldPassword, newPassword, ne2Password, options) {
        var self = this,
            userid = options.context.user,
            user = null;

        if (newPassword !== ne2Password) {
            return Promise.reject(new Error('Your new passwords do not match'));
        }

        return validatePasswordLength(newPassword).then(function () {
            return self.forge({id: userid}).fetch({require: true});
        }).then(function (_user) {
            user = _user;
            return bcryptCompare(oldPassword, user.get('password'));
        }).then(function (matched) {
            if (!matched) {
                return Promise.reject(new Error('Your password is incorrect'));
            }
            return bcryptGenSalt();
        }).then(function (salt) {
            return bcryptHash(newPassword, salt);
        }).then(function (hash) {
            user.save({password: hash});
            return user;
        });
    },

    generateResetToken: function (email, expires, dbHash) {
        return this.getByEmail(email).then(function (foundUser) {
            if (!foundUser) {
                return Promise.reject(new errors.NotFoundError('There is no user with that email address.'));
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
            return Promise.reject(new Error('Invalid token structure'));
        }

        expires = parseInt(parts[0], 10);
        email = parts[1];

        if (isNaN(expires)) {
            return Promise.reject(new Error('Invalid token expiration'));
        }

        // Check if token is expired to prevent replay attacks
        if (expires < Date.now()) {
            return Promise.reject(new Error('Expired token'));
        }

        // to prevent brute force attempts to reset the password the combination of email+expires is only allowed for
        // 10 attempts
        if (tokenSecurity[email + '+' + expires] && tokenSecurity[email + '+' + expires].count >= 10) {
            return Promise.reject(new Error('Token locked'));
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
                return email;
            }

            // increase the count for email+expires for each failed attempt
            tokenSecurity[email + '+' + expires] = {
                count: tokenSecurity[email + '+' + expires] ? tokenSecurity[email + '+' + expires].count + 1 : 1
            };
            return Promise.reject(new Error('Invalid token'));
        });
    },

    resetPassword: function (token, newPassword, ne2Password, dbHash) {
        var self = this;

        if (newPassword !== ne2Password) {
            return Promise.reject(new Error('Your new passwords do not match'));
        }

        return validatePasswordLength(newPassword).then(function () {
            // Validate the token; returns the email address from token
            return self.validateToken(token, dbHash);
        }).then(function (email) {
            // Fetch the user by email, and hash the password at the same time.
            return Promise.join(
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

    transferOwnership: function (object, options) {
        var adminRole,
            ownerRole,
            contextUser,
            assignUser;

        // Get admin role
        return ghostBookshelf.model('Role').findOne({name: 'Administrator'}).then(function (result) {
            adminRole = result;
            return ghostBookshelf.model('Role').findOne({name: 'Owner'});
        }).then(function (result) {
            ownerRole = result;
            return User.findOne({id: options.context.user});
        }).then(function (ctxUser) {
            // check if user has the owner role
            var currentRoles = ctxUser.toJSON().roles;
            if (!_.contains(currentRoles, ownerRole.id)) {
                return Promise.reject(new errors.NoPermissionError('Only owners are able to transfer the owner role.'));
            }
            contextUser = ctxUser;
            return User.findOne({id: object.id});
        }).then(function (user) {
            var currentRoles = user.toJSON().roles;
            if (!_.contains(currentRoles, adminRole.id)) {
                return Promise.reject(new errors.ValidationError('Only administrators can be assigned the owner role.'));
            }

            assignUser = user;
            // convert owner to admin
            return contextUser.roles().updatePivot({role_id: adminRole.id});
        }).then(function () {
            // assign owner role to a new user
            return assignUser.roles().updatePivot({role_id: ownerRole.id});
        }).then(function () {
            return Users.forge()
                .query('whereIn', 'id', [contextUser.id, assignUser.id])
                .fetch({withRelated: ['roles']});
        }).then(function (users) {
            return users.toJSON({include: ['roles']});
        });
    },

    gravatarLookup: function (userData) {
        var gravatarUrl = '//www.gravatar.com/avatar/' +
                crypto.createHash('md5').update(userData.email.toLowerCase().trim()).digest('hex') +
                '?d=404&s=250';

        return new Promise(function (resolve) {
            if (config.isPrivacyDisabled('useGravatar')) {
                resolve(userData);
            }

            http.get('http:' + gravatarUrl, function (res) {
                if (res.statusCode !== 404) {
                    userData.image = gravatarUrl;
                }

                resolve(userData);
            }).on('error', function () {
                // Error making request just continue.
                resolve(userData);
            });
        });
    },
    // Get the user by email address, enforces case insensitivity rejects if the user is not found
    // When multi-user support is added, email addresses must be deduplicated with case insensitivity, so that
    // joe@bloggs.com and JOE@BLOGGS.COM cannot be created as two separate users.
    getByEmail: function (email, options) {
        options = options || {};
        // We fetch all users and process them in JS as there is no easy way to make this query across all DBs
        // Although they all support `lower()`, sqlite can't case transform unicode characters
        // This is somewhat mute, as validator.isEmail() also doesn't support unicode, but this is much easier / more
        // likely to be fixed in the near future.
        options.require = true;

        return Users.forge(options).fetch(options).then(function (users) {
            var userWithEmail = users.find(function (user) {
                return user.get('email').toLowerCase() === email.toLowerCase();
            });
            if (userWithEmail) {
                return userWithEmail;
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
