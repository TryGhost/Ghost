const _ = require('lodash');
const models = require('../../models');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
  userNotFound: 'User not found',
  apiKeyNotFound: 'API Key not found',
};

/**
 * canThis only ever reads the action and object type of a permission, so
 * providers hand it plain objects rather than Bookshelf models.
 *
 * @param {import('bookshelf').Model} perm
 * @returns {{action_type: string, object_type: string}}
 */
function toPlainPermission(perm) {
  return {
    action_type: perm.get('action_type'),
    object_type: perm.get('object_type'),
  };
}

module.exports = {
  user: function (id) {
    return models.User.findOne(
      { id: id },
      { withRelated: ['permissions', 'roles', 'roles.permissions'] },
    ).then(function (foundUser) {
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

      const user = foundUser.toJSON();
      const permissionGroups = _.map(foundUser.related('roles').models, function (role) {
        return role.related('permissions').models;
      });

      permissionGroups.push(foundUser.related('permissions').models);

      const permissions = _.uniqBy(
        _.flatten(permissionGroups).map(toPlainPermission),
        function (perm) {
          return perm.action_type + '-' + perm.object_type;
        },
      );

      return { permissions, roles: user.roles };
    });
  },

  apiKey(id) {
    return models.ApiKey.findOne({ id }, { withRelated: ['role', 'role.permissions'] }).then(
      (foundApiKey) => {
        if (!foundApiKey) {
          throw new errors.NotFoundError({
            message: tpl(messages.apiKeyNotFound),
          });
        }

        // api keys have a belongs_to relationship to a role and no individual permissions
        // so there's no need for permission deduplication
        const permissions = foundApiKey
          .related('role')
          .related('permissions')
          .models.map(toPlainPermission);
        const roles = [foundApiKey.toJSON().role];

        return { permissions, roles };
      },
    );
  },
};
