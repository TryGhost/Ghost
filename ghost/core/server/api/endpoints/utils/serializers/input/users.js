const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:input:users');
const url = require('./utils/url');

/**
 * Permissions come from the role permissions map rather than the database, so
 * the `permissions` and `roles.permissions` includes are not loaded as
 * relations. They are taken off withRelated here and filled in by the users
 * output mapper.
 */
function mapPermissionIncludes(frame) {
  const withRelated = frame.options.withRelated;

  if (!withRelated) {
    return;
  }

  const permissions = withRelated.includes('permissions');
  const rolePermissions = withRelated.includes('roles.permissions');

  if (!permissions && !rolePermissions) {
    return;
  }

  frame.permissionIncludes = { permissions, rolePermissions };
  frame.options.withRelated = withRelated.filter(
    (relation) => relation !== 'permissions' && relation !== 'roles.permissions',
  );

  if (rolePermissions && !frame.options.withRelated.includes('roles')) {
    frame.options.withRelated.push('roles');
  }
}

module.exports = {
  browse(apiConfig, frame) {
    debug('browse');

    mapPermissionIncludes(frame);

    // Staff users route through the authors router types.
    url.forceUrlColumns(frame, 'authors');
  },

  read(apiConfig, frame) {
    debug('read');

    mapPermissionIncludes(frame);

    url.forceUrlColumns(frame, 'authors');

    if (frame.data.id === 'me' && frame.options.context && frame.options.context.user) {
      frame.data.id = frame.options.context.user;
    }
  },

  edit(apiConfig, frame) {
    debug('edit');

    mapPermissionIncludes(frame);

    if (frame.options.id === 'me' && frame.options.context && frame.options.context.user) {
      frame.options.id = frame.options.context.user;
    }

    delete frame.data.users[0].password;
    delete frame.data.users[0].last_seen;

    frame.data.users[0] = url.forUser(Object.assign({}, frame.data.users[0]));
  },
};
