import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import { z } from 'zod';
import { definitions } from './definitions';

export const permissionSchema = z
  .object({
    action_type: z.string().min(1),
    object_type: z.string().min(1),
  })
  .readonly();

export type Permission = z.infer<typeof permissionSchema>;

const policySchema = z.object({
  permissions: z.array(permissionSchema).min(1),
  roles: z.array(z.string().min(1)).min(1),
  grants: z.record(
    z.string(),
    z.record(z.string(), z.union([z.string().min(1), z.array(z.string().min(1))])),
  ),
});

export function permissionKey(permission: Permission): string {
  return JSON.stringify([permission.action_type, permission.object_type]);
}

const emptyPermissions: readonly Permission[] = Object.freeze([]);

export class RolePermissions {
  readonly #all: readonly Permission[];
  readonly #byRole = new Map<string, readonly Permission[]>();
  readonly version: string;

  constructor(input: unknown = definitions) {
    const { permissions, roles, grants } = policySchema.parse(input);
    this.#all = Object.freeze([...new Map(permissions.map((p) => [permissionKey(p), p])).values()]);

    const roleNames = new Set(roles);
    if (roleNames.size !== roles.length) {
      throw new errors.InternalServerError({
        message: 'Permission policy contains duplicate roles',
      });
    }
    for (const [roleName, objects] of Object.entries(grants)) {
      if (!roleNames.has(roleName)) {
        throw new errors.InternalServerError({
          message: `Permission policy contains unknown role: ${roleName}`,
        });
      }
      for (const [objectType, actions] of Object.entries(objects)) {
        const available = this.#all.filter((p) => p.object_type === objectType);
        const requested = Array.isArray(actions) ? actions : actions === 'all' ? [] : [actions];
        if (
          !available.length ||
          requested.some((action) => !available.some((p) => p.action_type === action))
        ) {
          throw new errors.InternalServerError({
            message: `Permission policy contains unknown grant: ${roleName}/${objectType}`,
          });
        }
      }
    }

    for (const name of roles) {
      const objects = grants[name] ?? {};
      this.#byRole.set(
        name,
        Object.freeze(
          this.#all.filter((p) => {
            const actions = objects[p.object_type];
            return (
              actions === 'all' ||
              (Array.isArray(actions) ? actions.includes(p.action_type) : actions === p.action_type)
            );
          }),
        ),
      );
    }

    this.version = createHash('sha256')
      .update(
        JSON.stringify([
          this.#all.map(permissionKey).sort(),
          [...this.#byRole]
            .map(([name, values]) => [name, values.map(permissionKey).sort()])
            .sort(),
        ]),
      )
      .digest('hex');
    Object.freeze(this);
  }

  all(): readonly Permission[] {
    return this.#all;
  }

  hasRole(name: string): boolean {
    return this.#byRole.has(name);
  }

  forRoles(names: readonly string[]): readonly Permission[] {
    if (names.length === 1) {
      return this.#byRole.get(names[0]) ?? emptyPermissions;
    }
    const permissions = new Map<string, Permission>();
    for (const name of names) {
      for (const permission of this.#byRole.get(name) ?? emptyPermissions) {
        permissions.set(permissionKey(permission), permission);
      }
    }
    return Object.freeze([...permissions.values()]);
  }
}

let policy: RolePermissions | undefined;

export function init(input: unknown = definitions): RolePermissions {
  const next = new RolePermissions(input);
  policy = next;
  return next;
}

function initializedPolicy(): RolePermissions {
  if (!policy) {
    throw new errors.InternalServerError({
      message: 'Permission policy must be initialized during boot',
    });
  }
  return policy;
}

export function all(): readonly Permission[] {
  return initializedPolicy().all();
}

export function forRoles(names: readonly string[]): readonly Permission[] {
  return initializedPolicy().forRoles(names);
}
