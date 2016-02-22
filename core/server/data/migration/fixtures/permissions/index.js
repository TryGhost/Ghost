// # Permissions Fixtures
// Sets up the permissions, and the default permissions_roles relationships
var Promise     = require('bluebird'),
    _           = require('lodash'),
    errors      = require('../../../../errors'),
    i18n        = require('../../../../i18n'),
    models      = require('../../../../models'),
    sequence    = require('../../../../utils/sequence'),
    fixtures    = require('./permissions'),

    // private
    logInfo,
    addAllPermissions,
    addAllRolesPermissions,
    addRolesPermissionsForRole,

    // public
    populate;

logInfo = function logInfo(message) {
    errors.logInfo('Migrations', message);
};

addRolesPermissionsForRole = function (roleName) {
    var fixturesForRole = fixtures.permissions_roles[roleName],
        permissionsToAdd;

    return models.Role.forge({name: roleName}).fetch({withRelated: ['permissions']}).then(function (role) {
        return models.Permissions.forge().fetch().then(function (permissions) {
            if (_.isObject(fixturesForRole)) {
                permissionsToAdd = _.map(permissions.toJSON(), function (permission) {
                    var objectPermissions = fixturesForRole[permission.object_type];
                    if (objectPermissions === 'all') {
                        return permission.id;
                    } else if (_.isArray(objectPermissions) && _.contains(objectPermissions, permission.action_type)) {
                        return permission.id;
                    }
                    return null;
                });
            }

            return role.permissions().attach(_.compact(permissionsToAdd));
        });
    });
};

addAllRolesPermissions = function () {
    var roleNames = _.keys(fixtures.permissions_roles),
        ops = [];

    _.each(roleNames, function (roleName) {
        ops.push(addRolesPermissionsForRole(roleName));
    });

    return Promise.all(ops);
};

addAllPermissions = function (options) {
    var ops = [];
    _.each(fixtures.permissions, function (permissions, objectType) {
        _.each(permissions, function (permission) {
            ops.push(function () {
                permission.object_type = objectType;
                return models.Permission.add(permission, options);
            });
        });
    });

    return sequence(ops);
};

// ## Populate
populate = function (options) {
    logInfo(i18n.t('errors.data.fixtures.populatingPermissions'));
    // ### Ensure all permissions are added
    return addAllPermissions(options).then(function () {
        // ### Ensure all roles_permissions are added
        return addAllRolesPermissions();
    });
};

module.exports = {
    populate: populate
};
