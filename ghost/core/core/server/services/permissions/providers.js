const models = require('../../models');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const rolePermissions = require('./role-permissions');

const messages = {
  userNotFound: 'User not found',
  apiKeyNotFound: 'API Key not found',
};

module.exports = {
  user: function (id) {
    return models.User.findOne({ id: id }, { withRelated: ['roles'] }).then(function (foundUser) {
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
      const roleNames = user.roles.map((role) => role.name);

      // The role -> permission mapping is static, so permissions come from the
      // in-memory map rather than the database. The role itself is real data
      // and is still loaded above.
      return { permissions: rolePermissions.forRoles(roleNames), roles: user.roles };
    });
  },

  apiKey(id) {
    return models.ApiKey.findOne({ id }, { withRelated: ['role'] }).then((foundApiKey) => {
      if (!foundApiKey) {
        throw new errors.NotFoundError({
          message: tpl(messages.apiKeyNotFound),
        });
      }

      // api keys have a belongs_to relationship to a single role. A key with no
      // role has no permissions (unchanged from loading role.permissions before).
      const role = foundApiKey.toJSON().role;
      const permissions = role ? rolePermissions.forRoles([role.name]) : [];

      return { permissions, roles: [role] };
    });
  },
};
