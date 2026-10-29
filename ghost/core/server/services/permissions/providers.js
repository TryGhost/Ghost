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
      const permissions = rolePermissions.forRoles(user.roles.map((role) => role.name));

      return { permissions, roles: user.roles };
    });
  },

  apiKey(id) {
    return models.ApiKey.findOne({ id }, { withRelated: ['role'] }).then((foundApiKey) => {
      if (!foundApiKey) {
        throw new errors.NotFoundError({
          message: tpl(messages.apiKeyNotFound),
        });
      }

      // Content API keys have no role, so they get no permissions.
      const role = foundApiKey.toJSON().role;
      const permissions = role?.name ? rolePermissions.forRoles([role.name]) : [];

      return { permissions, roles: [role] };
    });
  },
};
