var _              = require('lodash'),
    errors         = require('../errors'),
    ghostBookshelf = require('./base'),
    Promise        = require('bluebird'),
    i18n           = require('../i18n'),

    Role,
    Roles;

Role = ghostBookshelf.Model.extend({

    tableName: 'roles',

    users: function users() {
        return this.belongsToMany('User');
    },

    permissions: function permissions() {
        return this.belongsToMany('Permission');
    }
}, {
    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['withRelated']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    permissible: function permissible(roleModelOrId, action, context, loadedPermissions, hasUserPermission, hasAppPermission) {
        var self = this,
            checkAgainst = [],
            origArgs;

        // If we passed in an id instead of a model, get the model
        // then check the permissions
        if (_.isNumber(roleModelOrId) || _.isString(roleModelOrId)) {
            // Grab the original args without the first one
            origArgs = _.toArray(arguments).slice(1);
            // Get the actual role model
            return this.findOne({id: roleModelOrId, status: 'all'}).then(function then(foundRoleModel) {
                // Build up the original args but substitute with actual model
                var newArgs = [foundRoleModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            }, errors.logAndThrowError);
        }

        if (action === 'assign' && loadedPermissions.user) {
            if (_.any(loadedPermissions.user.roles, {name: 'Owner'})) {
                checkAgainst = ['Owner', 'Administrator', 'Editor', 'Author'];
            } else if (_.any(loadedPermissions.user.roles, {name: 'Administrator'})) {
                checkAgainst = ['Administrator', 'Editor', 'Author'];
            } else if (_.any(loadedPermissions.user.roles, {name: 'Editor'})) {
                checkAgainst = ['Author'];
            }

            // Role in the list of permissible roles
            hasUserPermission = roleModelOrId && _.contains(checkAgainst, roleModelOrId.get('name'));
        }

        if (hasUserPermission && hasAppPermission) {
            return Promise.resolve();
        }

        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.models.role.notEnoughPermission')));
    }
});

Roles = ghostBookshelf.Collection.extend({
    model: Role
});

module.exports = {
    Role: ghostBookshelf.model('Role', Role),
    Roles: ghostBookshelf.collection('Roles', Roles)
};
