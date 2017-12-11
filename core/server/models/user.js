var _ = require('lodash'),
    Promise = require('bluebird'),
    bcrypt = require('bcryptjs'),
    validator = require('validator'),
    ObjectId = require('bson-objectid'),
    ghostBookshelf = require('./base'),
    baseUtils = require('./base/utils'),
    common = require('../lib/common'),
    utils = require('../utils'),
    gravatar = require('../utils/gravatar'),
    validation = require('../data/validation'),
    pipeline = require('../utils/pipeline'),

    bcryptGenSalt = Promise.promisify(bcrypt.genSalt),
    bcryptHash = Promise.promisify(bcrypt.hash),
    bcryptCompare = Promise.promisify(bcrypt.compare),
    activeStates = ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4'],
    /**
     * inactive: owner user before blog setup, suspended users
     * locked user: imported users, they get a random passport
     */
    inactiveStates = ['inactive', 'locked'],
    allStates = activeStates.concat(inactiveStates),
    User,
    Users;

/**
 * generate a random salt and then hash the password with that salt
 */
function generatePasswordHash(password) {
    return bcryptGenSalt().then(function (salt) {
        return bcryptHash(password, salt);
    });
}

User = ghostBookshelf.Model.extend({

    tableName: 'users',

    defaults: function defaults() {
        var baseDefaults = ghostBookshelf.Model.prototype.defaults.call(this);

        return _.merge({
            password: utils.uid(50)
        }, baseDefaults);
    },

    emitChange: function emitChange(event, options) {
        common.events.emit('user' + '.' + event, this, options);
    },

    onDestroyed: function onDestroyed(model, response, options) {
        if (_.includes(activeStates, model.previous('status'))) {
            model.emitChange('deactivated', options);
        }

        model.emitChange('deleted');
    },

    onCreated: function onCreated(model) {
        model.emitChange('added');

        // active is the default state, so if status isn't provided, this will be an active user
        if (!model.get('status') || _.includes(activeStates, model.get('status'))) {
            model.emitChange('activated');
        }
    },

    onUpdated: function onUpdated(model, response, options) {
        model.statusChanging = model.get('status') !== model.updated('status');
        model.isActive = _.includes(activeStates, model.get('status'));

        if (model.statusChanging) {
            model.emitChange(model.isActive ? 'activated' : 'deactivated', options);
        } else {
            if (model.isActive) {
                model.emitChange('activated.edited');
            }
        }

        model.emitChange('edited');
    },

    isActive: function isActive() {
        return activeStates.indexOf(this.get('status')) !== -1;
    },

    isLocked: function isLocked() {
        return this.get('status') === 'locked';
    },

    isInactive: function isInactive() {
        return this.get('status') === 'inactive';
    },

    /**
     * Lookup Gravatar if email changes to update image url
     * Generating a slug requires a db call to look for conflicting slugs
     */
    onSaving: function onSaving(newPage, attr, options) {
        var self = this,
            tasks = [],
            passwordValidation = {};

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        // If the user's email is set & has changed & we are not importing
        if (self.hasChanged('email') && self.get('email') && !options.importing) {
            tasks.gravatar = (function lookUpGravatar() {
                return gravatar.lookup({
                    email: self.get('email')
                }).then(function (response) {
                    if (response && response.image) {
                        self.set('profile_image', response.image);
                    }
                });
            })();
        }

        if (this.hasChanged('slug') || !this.get('slug')) {
            tasks.slug = (function generateSlug() {
                return ghostBookshelf.Model.generateSlug(
                    User,
                    self.get('slug') || self.get('name'),
                    {
                        status: 'all',
                        transacting: options.transacting,
                        shortSlug: !self.get('slug')
                    })
                    .then(function then(slug) {
                        self.set({slug: slug});
                    });
            })();
        }

        /**
         * CASE: add model, hash password
         * CASE: update model, hash password
         *
         * Important:
         *   - Password hashing happens when we import a database
         *   - we do some pre-validation checks, because onValidate is called AFTER onSaving
         *   - when importing, we set the password to a random uid and don't validate, just hash it and lock the user
         *   - when importing with `importPersistUser` we check if the password is a bcrypt hash already and fall back to
         *     normal behaviour if not (set random password, lock user, and hash password)
         *   - no validations should run, when importing
         */
        if (self.isNew() || self.hasChanged('password')) {
            this.set('password', String(this.get('password')));

            // CASE: import with `importPersistUser` should always be an bcrypt password already,
            // and won't re-hash or overwrite it.
            // In case the password is not bcrypt hashed we fall back to the standard behaviour.
            if (options.importPersistUser && this.get('password').match(/^\$2[ayb]\$.{56}$/i)) {
                return;
            }

            if (options.importing) {
                // always set password to a random uid when importing
                this.set('password', utils.uid(50));

                // lock users so they have to follow the password reset flow
                if (this.get('status') !== 'inactive') {
                    this.set('status', 'locked');
                }
            } else {
                // CASE: we're not importing data, run the validations
                passwordValidation = validation.validatePassword(this.get('password'), this.get('email'));

                if (!passwordValidation.isValid) {
                    return Promise.reject(new common.errors.ValidationError({message: passwordValidation.message}));
                }
            }

            tasks.hashPassword = (function hashPassword() {
                return generatePasswordHash(self.get('password'))
                    .then(function (hash) {
                        self.set('password', hash);
                    });
            })();
        }

        return Promise.props(tasks);
    },

    // For the user model ONLY it is possible to disable validations.
    // This is used to bypass validation during the credential check, and must never be done with user-provided data
    // Should be removed when #3691 is done
    onValidate: function validate() {
        var opts = arguments[1],
            userData;

        if (opts && _.has(opts, 'validate') && opts.validate === false) {
            return;
        }

        // use the base toJSON since this model's overridden toJSON
        // removes fields and we want everything to run through the validator.
        userData = ghostBookshelf.Model.prototype.toJSON.call(this);

        return validation.validateSchema(this.tableName, userData);
    },

    toJSON: function toJSON(options) {
        options = options || {};

        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        // remove password hash for security reasons
        delete attrs.password;
        delete attrs.ghost_auth_access_token;

        // NOTE: We don't expose the email address for for external, app and public context.
        // @TODO: Why? External+Public is actually the same context? Was also mentioned here https://github.com/TryGhost/Ghost/issues/9043
        if (!options || !options.context || (!options.context.user && !options.context.internal)) {
            delete attrs.email;
        }

        // We don't expose these fields when fetching data via the public API.
        if (options && options.context && options.context.public) {
            delete attrs.created_at;
            delete attrs.created_by;
            delete attrs.updated_at;
            delete attrs.updated_by;
            delete attrs.last_seen;
            delete attrs.status;
            delete attrs.ghost_auth_id;
        }

        return attrs;
    },

    format: function format(options) {
        if (!_.isEmpty(options.website) &&
            !validator.isURL(options.website, {
                require_protocol: true,
                protocols: ['http', 'https']
            })) {
            options.website = 'http://' + options.website;
        }
        return ghostBookshelf.Model.prototype.format.call(this, options);
    },

    posts: function posts() {
        return this.hasMany('Posts', 'created_by');
    },

    roles: function roles() {
        return this.belongsToMany('Role');
    },

    permissions: function permissions() {
        return this.belongsToMany('Permission');
    },

    hasRole: function hasRole(roleName) {
        var roles = this.related('roles');

        return roles.some(function getRole(role) {
            return role.get('name') === roleName;
        });
    },

    enforcedFilters: function enforcedFilters() {
        if (this.isInternalContext()) {
            return null;
        }

        return this.isPublicContext() ? 'status:[' + allStates.join(',') + ']' : null;
    },

    defaultFilters: function defaultFilters() {
        if (this.isInternalContext()) {
            return null;
        }

        return this.isPublicContext() ? null : 'status:[' + allStates.join(',') + ']';
    }
}, {
    orderDefaultOptions: function orderDefaultOptions() {
        return {
            last_seen: 'DESC',
            name: 'ASC',
            created_at: 'DESC'
        };
    },

    /**
     * @deprecated in favour of filter
     */
    processOptions: function processOptions(options) {
        if (!options.status) {
            return options;
        }

        // This is the only place that 'options.where' is set now
        options.where = {statements: []};

        var value;

        // Filter on the status.  A status of 'all' translates to no filter since we want all statuses
        if (options.status !== 'all') {
            // make sure that status is valid
            options.status = allStates.indexOf(options.status) > -1 ? options.status : 'active';
        }

        if (options.status === 'active') {
            value = activeStates;
        } else if (options.status === 'all') {
            value = allStates;
        } else {
            value = options.status;
        }

        options.where.statements.push({prop: 'status', op: 'IN', value: value});
        delete options.status;

        return options;
    },

    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName, options) {
        var permittedOptionsToReturn = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['withRelated', 'status'],
                setup: ['id'],
                edit: ['withRelated', 'id', 'importPersistUser'],
                add: ['importPersistUser'],
                findPage: ['page', 'limit', 'columns', 'filter', 'order', 'status'],
                findAll: ['filter']
            };

        if (validOptions[methodName]) {
            permittedOptionsToReturn = permittedOptionsToReturn.concat(validOptions[methodName]);
        }

        // CASE: The `include` parameter is allowed when using the public API, but not the `roles` value.
        // Otherwise we expose too much information.
        if (options && options.context && options.context.public) {
            if (options.include && options.include.indexOf('roles') !== -1) {
                options.include.splice(options.include.indexOf('roles'), 1);
            }
        }

        return permittedOptionsToReturn;
    },

    /**
     * ### Find One
     *
     * We have to clone the data, because we remove values from this object.
     * This is not expected from outside!
     *
     * @extends ghostBookshelf.Model.findOne to include roles
     * **See:** [ghostBookshelf.Model.findOne](base.js.html#Find%20One)
     */
    findOne: function findOne(dataToClone, options) {
        var query,
            status,
            data = _.cloneDeep(dataToClone),
            lookupRole = data.role;

        delete data.role;
        data = _.defaults(data || {}, {
            status: 'all'
        });

        status = data.status;
        delete data.status;

        data = this.filterData(data);
        options = this.filterOptions(options, 'findOne');
        options.withRelated = _.union(options.withRelated, options.include);

        // Support finding by role
        if (lookupRole) {
            options.withRelated = _.union(options.withRelated, ['roles']);
            options.include = _.union(options.include, ['roles']);

            query = this.forge(data, {include: options.include});

            query.query('join', 'roles_users', 'users.id', '=', 'roles_users.user_id');
            query.query('join', 'roles', 'roles_users.role_id', '=', 'roles.id');
            query.query('where', 'roles.name', '=', lookupRole);
        } else {
            // We pass include to forge so that toJSON has access
            query = this.forge(data, {include: options.include});
        }

        if (status === 'active') {
            query.query('whereIn', 'status', activeStates);
        } else if (status !== 'all') {
            query.query('where', {status: status});
        }

        return query.fetch(options);
    },

    /**
     * ### Edit
     *
     * Note: In case of login the last_seen attribute gets updated.
     *
     * @extends ghostBookshelf.Model.edit to handle returning the full object
     * **See:** [ghostBookshelf.Model.edit](base.js.html#edit)
     */
    edit: function edit(data, options) {
        var self = this,
            ops = [];

        if (data.roles && data.roles.length > 1) {
            return Promise.reject(
                new common.errors.ValidationError({message: common.i18n.t('errors.models.user.onlyOneRolePerUserSupported')})
            );
        }

        options = options || {};
        options.withRelated = _.union(options.withRelated, options.include);

        if (data.email) {
            ops.push(function checkForDuplicateEmail() {
                return self.getByEmail(data.email, options).then(function then(user) {
                    if (user && user.id !== options.id) {
                        return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.models.user.userUpdateError.emailIsAlreadyInUse')}));
                    }
                });
            });
        }

        ops.push(function update() {
            return ghostBookshelf.Model.edit.call(self, data, options).then(function then(user) {
                var roleId;

                if (!data.roles) {
                    return user;
                }

                roleId = data.roles[0].id || data.roles[0];

                return user.roles().fetch().then(function then(roles) {
                    // return if the role is already assigned
                    if (roles.models[0].id === roleId) {
                        return;
                    }
                    return ghostBookshelf.model('Role').findOne({id: roleId});
                }).then(function then(roleToAssign) {
                    if (roleToAssign && roleToAssign.get('name') === 'Owner') {
                        return Promise.reject(
                            new common.errors.ValidationError({message: common.i18n.t('errors.models.user.methodDoesNotSupportOwnerRole')})
                        );
                    } else {
                        // assign all other roles
                        return user.roles().updatePivot({role_id: roleId});
                    }
                }).then(function then() {
                    options.status = 'all';
                    return self.findOne({id: user.id}, options);
                });
            });
        });

        return pipeline(ops);
    },

    /**
     * ## Add
     * Naive user add
     * Hashes the password provided before saving to the database.
     *
     * We have to clone the data, because we remove values from this object.
     * This is not expected from outside!
     *
     * @param {object} dataToClone
     * @param {object} options
     * @extends ghostBookshelf.Model.add to manage all aspects of user signup
     * **See:** [ghostBookshelf.Model.add](base.js.html#Add)
     */
    add: function add(dataToClone, options) {
        var self = this,
            data = _.cloneDeep(dataToClone),
            userData = this.filterData(data),
            roles;

        options = this.filterOptions(options, 'add');
        options.withRelated = _.union(options.withRelated, options.include);

        // check for too many roles
        if (data.roles && data.roles.length > 1) {
            return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.models.user.onlyOneRolePerUserSupported')}));
        }

        function getAuthorRole() {
            return ghostBookshelf.model('Role').findOne({name: 'Author'}, _.pick(options, 'transacting'))
                .then(function then(authorRole) {
                    return [authorRole.get('id')];
                });
        }

        /**
         * We need this default author role because of the following Ghost feature:
         * You setup your blog and you can invite people instantly, but without choosing a role.
         * roles: [] -> no default role (used for owner creation, see fixtures.json)
         * roles: undefined -> default role
         */
        roles = data.roles;
        delete data.roles;

        return ghostBookshelf.Model.add.call(self, userData, options)
            .then(function then(addedUser) {
                // Assign the userData to our created user so we can pass it back
                userData = addedUser;
            })
            .then(function () {
                if (!roles) {
                    return getAuthorRole();
                }

                return Promise.resolve(roles);
            })
            .then(function (_roles) {
                roles = _roles;

                // CASE: it is possible to add roles by name, by id or by object
                if (_.isString(roles[0]) && !ObjectId.isValid(roles[0])) {
                    return Promise.map(roles, function (roleName) {
                        return ghostBookshelf.model('Role').findOne({
                            name: roleName
                        }, options);
                    }).then(function (roleModels) {
                        roles = [];

                        _.each(roleModels, function (roleModel) {
                            roles.push(roleModel.id);
                        });
                    });
                }

                return Promise.resolve();
            })
            .then(function () {
                return baseUtils.attach(User, userData.id, 'roles', roles, options);
            })
            .then(function then() {
                // find and return the added user
                return self.findOne({id: userData.id, status: 'all'}, options);
            });
    },

    /**
     * We override the owner!
     * Owner already has a slug -> force setting a new one by setting slug to null
     * @TODO: kill setup function?
     */
    setup: function setup(data, options) {
        var self = this,
            userData = this.filterData(data),
            passwordValidation = {};

        passwordValidation = validation.validatePassword(userData.password, userData.email, data.blogTitle);

        if (!passwordValidation.isValid) {
            return Promise.reject(new common.errors.ValidationError({message: passwordValidation.message}));
        }

        options = this.filterOptions(options, 'setup');
        options.withRelated = _.union(options.withRelated, options.include);

        userData.slug = null;
        return self.edit(userData, options);
    },

    /**
     * Right now the setup of the blog depends on the user status.
     * Only if the owner user is `inactive`, then the blog is not setup.
     * e.g. if you transfer ownership to a locked user, you blog is still setup.
     *
     * @TODO: Rename `inactive` status to something else, it's confusing. e.g. requires-setup
     * @TODO: Depending on the user status results in https://github.com/TryGhost/Ghost/issues/8003
     */
    isSetup: function isSetup(options) {
        return this.getOwnerUser(options)
            .then(function (owner) {
                return owner.get('status') !== 'inactive';
            });
    },

    getOwnerUser: function getOwnerUser(options) {
        options = options || {};

        return this.findOne({
            role: 'Owner',
            status: 'all'
        }, options).then(function (owner) {
            if (!owner) {
                return Promise.reject(new common.errors.NotFoundError({
                    message: common.i18n.t('errors.models.user.ownerNotFound')
                }));
            }

            return owner;
        });
    },

    permissible: function permissible(userModelOrId, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            userModel = userModelOrId,
            origArgs;

        // If we passed in a model without its related roles, we need to fetch it again
        if (_.isObject(userModelOrId) && !_.isObject(userModelOrId.related('roles'))) {
            userModelOrId = userModelOrId.id;
        }
        // If we passed in an id instead of a model get the model first
        if (_.isNumber(userModelOrId) || _.isString(userModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);

            // Get the actual user model
            return this.findOne({
                id: userModelOrId,
                status: 'all'
            }, {include: ['roles']}).then(function then(foundUserModel) {
                if (!foundUserModel) {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.models.user.userNotFound')
                    });
                }

                // Build up the original args but substitute with actual model
                var newArgs = [foundUserModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            });
        }

        if (action === 'edit') {
            // Owner can only be edited by owner
            if (loadedPermissions.user && userModel.hasRole('Owner')) {
                hasUserPermission = _.some(loadedPermissions.user.roles, {name: 'Owner'});
            }
            // Users with the role 'Editor' and 'Author' have complex permissions when the action === 'edit'
            // We now have all the info we need to construct the permissions
            if (loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Author'})) {
                // If this is the same user that requests the operation allow it.
                hasUserPermission = hasUserPermission || context.user === userModel.get('id');
            }

            if (loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Editor'})) {
                // If this is the same user that requests the operation allow it.
                hasUserPermission = context.user === userModel.get('id');

                // Alternatively, if the user we are trying to edit is an Author, allow it
                hasUserPermission = hasUserPermission || userModel.hasRole('Author');
            }
        }

        if (action === 'destroy') {
            // Owner cannot be deleted EVER
            if (loadedPermissions.user && userModel.hasRole('Owner')) {
                return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.models.user.notEnoughPermission')}));
            }

            // Users with the role 'Editor' have complex permissions when the action === 'destroy'
            if (loadedPermissions.user && _.some(loadedPermissions.user.roles, {name: 'Editor'})) {
                // If this is the same user that requests the operation allow it.
                hasUserPermission = context.user === userModel.get('id');

                // Alternatively, if the user we are trying to edit is an Author, allow it
                hasUserPermission = hasUserPermission || userModel.hasRole('Author');
            }
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve();
        }

        return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.models.user.notEnoughPermission')}));
    },

    // Finds the user by email, and checks the password
    // @TODO: shorten this function and rename...
    check: function check(object) {
        var self = this;

        return this.getByEmail(object.email).then(function then(user) {
            if (!user) {
                return Promise.reject(new common.errors.NotFoundError({
                    message: common.i18n.t('errors.models.user.noUserWithEnteredEmailAddr')
                }));
            }

            if (user.isLocked()) {
                return Promise.reject(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.models.user.accountLocked')
                }));
            }

            if (user.isInactive()) {
                return Promise.reject(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.models.user.accountSuspended')
                }));
            }

            return self.isPasswordCorrect({plainPassword: object.password, hashedPassword: user.get('password')})
                .then(function then() {
                    return Promise.resolve(user.set({status: 'active', last_seen: new Date()}).save({validate: false}))
                        .catch(function handleError(err) {
                            // If we get a validation or other error during this save, catch it and log it, but don't
                            // cause a login error because of it. The user validation is not important here.
                            common.logging.error(new common.errors.GhostError({
                                err: err,
                                context: common.i18n.t('errors.models.user.userUpdateError.context'),
                                help: common.i18n.t('errors.models.user.userUpdateError.help')
                            }));

                            return user;
                        });
                })
                .catch(function onError(err) {
                    return Promise.reject(err);
                });
        }, function handleError(error) {
            if (error.message === 'NotFound' || error.message === 'EmptyResponse') {
                return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.models.user.noUserWithEnteredEmailAddr')}));
            }

            return Promise.reject(error);
        });
    },

    isPasswordCorrect: function isPasswordCorrect(object) {
        var plainPassword = object.plainPassword,
            hashedPassword = object.hashedPassword;

        if (!plainPassword || !hashedPassword) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.models.user.passwordRequiredForOperation')
            }));
        }

        return bcryptCompare(plainPassword, hashedPassword)
            .then(function (matched) {
                if (matched) {
                    return;
                }

                return Promise.reject(new common.errors.ValidationError({
                    context: common.i18n.t('errors.models.user.incorrectPassword'),
                    message: common.i18n.t('errors.models.user.incorrectPassword'),
                    help: common.i18n.t('errors.models.user.userUpdateError.help'),
                    code: 'PASSWORD_INCORRECT'
                }));
            });
    },

    /**
     * Naive change password method
     * @param {Object} object
     * @param {Object} options
     */
    changePassword: function changePassword(object, options) {
        var self = this,
            newPassword = object.newPassword,
            userId = object.user_id,
            oldPassword = object.oldPassword,
            isLoggedInUser = userId === options.context.user,
            user;

        return self.forge({id: userId}).fetch({require: true})
            .then(function then(_user) {
                user = _user;

                if (isLoggedInUser) {
                    return self.isPasswordCorrect({
                        plainPassword: oldPassword,
                        hashedPassword: user.get('password')
                    });
                }
            })
            .then(function then() {
                return user.save({password: newPassword});
            });
    },

    transferOwnership: function transferOwnership(object, options) {
        var ownerRole,
            contextUser;

        return Promise.join(
            ghostBookshelf.model('Role').findOne({name: 'Owner'}),
            User.findOne({id: options.context.user}, {include: ['roles']})
        )
            .then(function then(results) {
                ownerRole = results[0];
                contextUser = results[1];

                // check if user has the owner role
                var currentRoles = contextUser.toJSON(options).roles;
                if (!_.some(currentRoles, {id: ownerRole.id})) {
                    return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.models.user.onlyOwnerCanTransferOwnerRole')}));
                }

                return Promise.join(ghostBookshelf.model('Role').findOne({name: 'Administrator'}),
                    User.findOne({id: object.id}, {include: ['roles']}));
            })
            .then(function then(results) {
                var adminRole = results[0],
                    user = results[1],
                    currentRoles = user.toJSON(options).roles;

                if (!_.some(currentRoles, {id: adminRole.id})) {
                    return Promise.reject(new common.errors.ValidationError({message: common.i18n.t('errors.models.user.onlyAdmCanBeAssignedOwnerRole')}));
                }

                // convert owner to admin
                return Promise.join(contextUser.roles().updatePivot({role_id: adminRole.id}),
                    user.roles().updatePivot({role_id: ownerRole.id}),
                    user.id);
            })
            .then(function then(results) {
                return Users.forge()
                    .query('whereIn', 'id', [contextUser.id, results[2]])
                    .fetch({withRelated: ['roles']});
            })
            .then(function then(users) {
                options.include = ['roles'];
                return users.toJSON(options);
            });
    },

    // Get the user by email address, enforces case insensitivity rejects if the user is not found
    // When multi-user support is added, email addresses must be deduplicated with case insensitivity, so that
    // joe@bloggs.com and JOE@BLOGGS.COM cannot be created as two separate users.
    getByEmail: function getByEmail(email, options) {
        options = options || {};
        // We fetch all users and process them in JS as there is no easy way to make this query across all DBs
        // Although they all support `lower()`, sqlite can't case transform unicode characters
        // This is somewhat mute, as validator.isEmail() also doesn't support unicode, but this is much easier / more
        // likely to be fixed in the near future.
        options.require = true;

        return Users.forge(options).fetch(options).then(function then(users) {
            var userWithEmail = users.find(function findUser(user) {
                return user.get('email').toLowerCase() === email.toLowerCase();
            });
            if (userWithEmail) {
                return userWithEmail;
            }
        });
    },
    inactiveStates: inactiveStates
});

Users = ghostBookshelf.Collection.extend({
    model: User
});

module.exports = {
    User: ghostBookshelf.model('User', User),
    Users: ghostBookshelf.collection('Users', Users)
};
