import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import { z } from 'zod';

export const permissionSchema = z
  .object({
    action_type: z.string().min(1),
    object_type: z.string().min(1),
  })
  .readonly();

export type Permission = z.infer<typeof permissionSchema>;

const fixturesSchema = z.object({
  models: z.array(z.object({ name: z.string(), entries: z.array(z.unknown()) })),
  relations: z.array(
    z.object({
      from: z.object({ model: z.string() }),
      to: z.object({ model: z.string() }),
      entries: z.unknown(),
    }),
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

  constructor(input: unknown) {
    const fixtures = fixturesSchema.parse(input);
    const permissionFixtures = fixtures.models.find((model) => model.name === 'Permission');
    const roleFixtures = fixtures.models.find((model) => model.name === 'Role');
    const grantFixtures = fixtures.relations.find(
      (relation) => relation.from.model === 'Role' && relation.to.model === 'Permission',
    );
    if (!permissionFixtures || !roleFixtures || !grantFixtures) {
      throw new errors.InternalServerError({
        message: 'Permission policy requires permission, role and role grant fixtures',
      });
    }

    const permissions = z.array(permissionSchema).min(1).parse(permissionFixtures.entries);
    this.#all = Object.freeze([...new Map(permissions.map((p) => [permissionKey(p), p])).values()]);
    const roles = z
      .array(z.object({ name: z.string().min(1) }))
      .min(1)
      .parse(roleFixtures.entries);
    const grants = z
      .record(
        z.string(),
        z.record(z.string(), z.union([z.string().min(1), z.array(z.string().min(1))])),
      )
      .parse(grantFixtures.entries);

    const roleNames = new Set(roles.map((role) => role.name));
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

    for (const { name } of roles) {
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

export function init(fixtures: unknown): RolePermissions {
  const next = new RolePermissions(fixtures);
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
