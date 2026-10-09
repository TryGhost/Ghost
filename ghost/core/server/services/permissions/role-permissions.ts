import { permissions as permissionData, rolePermissions as roleData } from './permissions-data';

export type Permission = {
  action_type: string;
  object_type: string;
};

const toKey = (perm: Permission) => `${perm.action_type}:${perm.object_type}`;

const allPermissions: Permission[] = Object.entries(permissionData).flatMap(
  ([objectType, actions]) =>
    actions.map((actionType) => ({ action_type: actionType, object_type: objectType })),
);

const byRole = new Map<string, Permission[]>(
  Object.entries(roleData).map(([roleName, objects]) => [
    roleName,
    allPermissions.filter((perm) => {
      const value = (objects as Record<string, 'all' | readonly string[]>)[perm.object_type];

      return value === 'all' || (value?.includes(perm.action_type) ?? false);
    }),
  ]),
);

/**
 * Every permission granted to any of the given roles, without duplicates.
 * Unknown roles, and Owner (which has no permission rows and is handled as a
 * bypass in canThis), contribute nothing.
 */
export function forRoles(names: readonly string[]): Permission[] {
  const seen = new Set<string>();
  const result: Permission[] = [];

  for (const roleName of names) {
    for (const perm of byRole.get(roleName) ?? []) {
      const key = toKey(perm);

      if (!seen.has(key)) {
        seen.add(key);
        result.push(perm);
      }
    }
  }

  return result;
}

/**
 * Every permission that exists, regardless of role. This is the universe the
 * actions map is built from.
 */
export function all(): Permission[] {
  return allPermissions.slice();
}

/**
 * The roles the map knows about. Owner is not among them: it has no
 * permission rows and is handled as a bypass in canThis.
 */
export function roleNames(): string[] {
  return [...byRole.keys()];
}
