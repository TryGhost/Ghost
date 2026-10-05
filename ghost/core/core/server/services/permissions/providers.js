const _ = require('lodash');
const models = require('../../models');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const policy = require('./policy');

const messages = {
  userNotFound: 'User not found',
  apiKeyNotFound: 'API Key not found',
};

module.exports = {
  user: function (id) {
    return models.User.findOne({ id: id }, { withRelated: ['permissions', 'roles'] }).then(
      async function (foundUser) {
        // CASE: {context: {user: id}} where the id is not in our database
        if (!foundUser) {
          return Promise.reject(
            new errors.NotFoundError({
              message: tpl(messages.userNotFound),
            }),
          );
        }

        if (foundUser.get('status') !== 'active') {
          return Promise.reject(new errors.UnauthorizedError());
        }

        const seenPerms = {};

        const roles = foundUser.related('roles').models;
        const staticPermissions = roles.map((role) =>
          policy.permissionsForRole(role.id, role.get('name')),
        );
        const fallbackRoles = roles.filter((role, index) => staticPermissions[index] === undefined);
        if (fallbackRoles.length) {
          // Load all incompatible roles together, retaining the legacy single
          // grant query for users with multiple custom roles.
          await models.Roles.forge(fallbackRoles).load('permissions');
        }
        const rolePerms = roles.map(
          (role, index) => staticPermissions[index] ?? role.related('permissions').models,
        );

        const allPerms = [];
        const user = foundUser.toJSON();

        rolePerms.push(foundUser.related('permissions').models);

        _.each(rolePerms, function (rolePermGroup) {
          _.each(rolePermGroup, function (perm) {
            const key =
              perm.get('action_type') + '-' + perm.get('object_type') + '-' + perm.get('object_id');

            // Only add perms once
            if (seenPerms[key]) {
              return;
            }

            allPerms.push(perm);
            seenPerms[key] = true;
          });
        });

        // Keep the model-compatible permission accessors at this legacy boundary;
        // static policy values do not need Bookshelf models.
        return { permissions: allPerms, roles: user.roles };
      },
    );
  },

  apiKey(id) {
    return models.ApiKey.findOne({ id }, { withRelated: ['role'] }).then(async (foundApiKey) => {
      if (!foundApiKey) {
        throw new errors.NotFoundError({
          message: tpl(messages.apiKeyNotFound),
        });
      }

      // api keys have a belongs_to relationship to a role and no individual permissions
      // so there's no need for permission deduplication
      const role = foundApiKey.related('role');
      let permissions = policy.permissionsForRole(role.id, role.get('name'));
      if (!role.id) {
        permissions = [];
      } else if (permissions === undefined) {
        await role.load('permissions');
        permissions = role.related('permissions').models;
      }
      const roles = [foundApiKey.toJSON().role];

      return { permissions, roles };
    });
  },
};
