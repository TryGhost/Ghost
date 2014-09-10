var _ = require('lodash'),
    Models = require('../models'),
    errors = require('../errors'),
    effective;

effective = {
    user: function (id) {
        return Models.User.findOne({id: id, status: 'all'}, {include: ['permissions', 'roles', 'roles.permissions']})
            .then(function (foundUser) {
                var seenPerms = {},
                    rolePerms = _.map(foundUser.related('roles').models, function (role) {
                        return role.related('permissions').models;
                    }),
                    allPerms = [],
                    user = foundUser.toJSON();

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

                return {permissions: allPerms, roles: user.roles};
            }, errors.logAndThrowError);
    },

    app: function (appName) {
        return Models.App.findOne({name: appName}, {withRelated: ['permissions']})
            .then(function (foundApp) {
                if (!foundApp) {
                    return [];
                }

                return {permissions: foundApp.related('permissions').models};
            }, errors.logAndThrowError);
    }
};

module.exports = effective;
