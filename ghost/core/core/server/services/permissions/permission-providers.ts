import errors from '@tryghost/errors';
import { z } from 'zod';
import * as rolePermissions from './role-permissions';
import type { Permission } from './role-permissions';

const models = require('../../models');

const rolesSchema = z.array(
  z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .passthrough()
    .nullish(),
);

export type PrincipalPermissions = {
  permissions: readonly Permission[];
  roles: z.infer<typeof rolesSchema>;
};

export async function user(id: string): Promise<PrincipalPermissions> {
  const foundUser = await models.User.findOne({ id }, { withRelated: ['roles'] });
  if (!foundUser) {
    throw new errors.NotFoundError({ message: 'User not found' });
  }
  if (foundUser.get('status') !== 'active') {
    throw new errors.UnauthorizedError();
  }
  const roles = rolesSchema.parse(foundUser.toJSON().roles);
  return {
    permissions: rolePermissions.forRoles(roles.flatMap((role) => (role?.name ? [role.name] : []))),
    roles,
  };
}

export async function apiKey(id: string): Promise<PrincipalPermissions> {
  const foundApiKey = await models.ApiKey.findOne({ id }, { withRelated: ['role'] });
  if (!foundApiKey) {
    throw new errors.NotFoundError({ message: 'API Key not found' });
  }
  const roles = rolesSchema.parse([foundApiKey.toJSON().role]);
  return {
    permissions: rolePermissions.forRoles(roles.flatMap((role) => (role?.name ? [role.name] : []))),
    roles,
  };
}

export const providers = { user, apiKey };
