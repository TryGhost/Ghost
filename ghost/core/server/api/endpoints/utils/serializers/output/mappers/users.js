const clean = require('../utils/clean');
const url = require('../utils/url');
const rolePermissions = require('../../../../../../services/permissions/role-permissions');

const toPermissionJSON = (perm) => ({
  action_type: perm.action_type,
  object_type: perm.object_type,
  object_id: null,
});

module.exports = (model, frame) => {
  const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

  url.forUser(model.id, jsonModel, frame.options);

  // Force-loaded for the URL computation, not requested by the caller (the
  // author permalink substitutes :slug, so `?fields=url` pulls it in).
  if (frame.forcedUrlColumns && frame.forcedUrlColumns.routerType === 'authors') {
    frame.forcedUrlColumns.columns.forEach((column) => {
      delete jsonModel[column];
    });
  }

  // Permissions come from code, not relations; see the users input serializer.
  if (frame.permissionIncludes?.permissions) {
    jsonModel.permissions = [];
  }

  if (frame.permissionIncludes?.rolePermissions && jsonModel.roles) {
    jsonModel.roles = jsonModel.roles.map((role) => ({
      ...role,
      permissions: rolePermissions.forRoles([role.name]).map(toPermissionJSON),
    }));
  }

  clean.author(jsonModel, frame);

  return jsonModel;
};
