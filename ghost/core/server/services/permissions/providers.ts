import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import * as rolePermissions from './role-permissions';
import type { Permission } from './role-permissions';

const models = require('../../models');

/** The user model's statuses; only `active` passes the check below */
export type UserStatus =
  | 'active'
  | 'inactive'
  | 'locked'
  | 'warn-1'
  | 'warn-2'
  | 'warn-3'
  | 'warn-4';

export interface Role {
  id: string;
  name: string;
}

/** What canThis needs to grant or deny for one actor */
export interface LoadedPermissions {
  permissions: Permission[];
  roles: Role[];
}

interface UserModel {
  get(attribute: 'status'): UserStatus;
  toJSON(): { roles: Role[] };
}

interface ApiKeyModel {
  toJSON(): { role?: Role | null };
}

const messages = {
  userNotFound: 'User not found',
  apiKeyNotFound: 'API Key not found',
};

const providers = {
  user: function (id: string): Promise<LoadedPermissions> {
    return models.User.findOne({ id: id }, { withRelated: ['roles'] }).then(function (
      foundUser: UserModel | null,
    ) {
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

  apiKey(
    id: string,
  ): Promise<{ permissions: Permission[]; roles: Array<Role | null | undefined> }> {
    return models.ApiKey.findOne({ id }, { withRelated: ['role'] }).then(
      (foundApiKey: ApiKeyModel | null) => {
        if (!foundApiKey) {
          throw new errors.NotFoundError({
            message: tpl(messages.apiKeyNotFound),
          });
        }

        // Content API keys have no role, so they get no permissions.
        const role = foundApiKey.toJSON().role;
        const permissions = role?.name ? rolePermissions.forRoles([role.name]) : [];

        return { permissions, roles: [role] };
      },
    );
  },
};

// One object, so tests can stub a provider that canThis calls
export default providers;
