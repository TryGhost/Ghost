var _ = require('lodash'),
    Promise = require('bluebird'),
    models = require('../../models'),
    common = require('../../lib/common');

module.exports = {
    user: function (id) {
        return models.User.findOne({id: id, status: 'all'}, {withRelated: ['permissions', 'roles', 'roles.permissions']})
            .then(function (foundUser) {
                // CASE: {context: {user: id}} where the id is not in our database
                if (!foundUser) {
                    return Promise.reject(new common.errors.NotFoundError({
                        message: common.i18n.t('errors.models.user.userNotFound')
                    }));
                }

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

                // @TODO fix this!
                // Permissions is an array of models
                // Roles is a JSON array
                return {permissions: allPerms, roles: user.roles};
            });
    },

    app: function (appName) {
        return models.App.findOne({name: appName}, {withRelated: ['permissions']})
            .then(function (foundApp) {
                if (!foundApp) {
                    return [];
                }

                return {permissions: foundApp.related('permissions').models};
            });
    }
};
