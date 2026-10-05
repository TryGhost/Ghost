import { z } from 'zod';
import errors from '@tryghost/errors';

const permissionSchema = z.object({
  name: z.string(),
  action_type: z.string(),
  object_type: z.string(),
  object_id: z.string().nullable().optional(),
});

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

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.array(permissionSchema),
});

type PermissionDefinition = z.infer<typeof permissionSchema>;

// Keep the existing provider contract at the CommonJS/model boundary. The policy
// itself owns immutable values and does not depend on Bookshelf.
export type StaticPermission = Readonly<{
  get: (key: string) => string | null | undefined;
}>;

function permissionKey(permission: PermissionDefinition): string {
  return JSON.stringify([
    permission.action_type,
    permission.object_type,
    permission.object_id ?? null,
  ]);
}

export class PermissionPolicy {
  readonly #roles = new Map<string, { name: string; permissions: readonly StaticPermission[] }>();

  constructor(fixturesInput: unknown, rolesInput: unknown) {
    const fixtures = fixturesSchema.parse(fixturesInput);
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

    const permissions = z.array(permissionSchema).parse(permissionFixtures.entries);
    const roles = z.array(z.object({ name: z.string() })).parse(roleFixtures.entries);
    const grants = z
      .record(z.string(), z.record(z.string(), z.union([z.string(), z.array(z.string())])))
      .parse(grantFixtures.entries);

    const definitionsByRole = new Map(
      roles.map((role) => {
        const roleGrants = grants[role.name] ?? {};
        const definitions = permissions.filter((permission) => {
          const actions = roleGrants[permission.object_type];
          return (
            actions === 'all' ||
            (Array.isArray(actions)
              ? actions.includes(permission.action_type)
              : actions === permission.action_type)
          );
        });
        return [role.name, definitions] as const;
      }),
    );

    for (const role of z.array(roleSchema).parse(rolesInput)) {
      const definitions = definitionsByRole.get(role.name);
      if (!definitions) {
        continue;
      }

      // Preserve installations with custom/restricted grants. Never union them
      // with the fixture policy, which could restore deliberately revoked access.
      const expected = new Set(definitions.map(permissionKey));
      const actual = new Set(role.permissions.map(permissionKey));
      if (expected.size !== actual.size || [...actual].some((key) => !expected.has(key))) {
        continue;
      }

      const values = definitions.map((definition) => {
        const attributes: Readonly<Record<string, string | null | undefined>> = Object.freeze({
          ...definition,
          object_id: definition.object_id ?? null,
        });
        return Object.freeze({ get: (key: string) => attributes[key] });
      });
      this.#roles.set(role.id, { name: role.name, permissions: Object.freeze(values) });
    }
  }

  permissionsForRole(id: string, name: string): readonly StaticPermission[] | undefined {
    const role = this.#roles.get(id);
    return role?.name === name ? role.permissions : undefined;
  }
}

let policy: PermissionPolicy | undefined;

export function init(fixtures: unknown, roles: unknown): void {
  // Publish only a complete policy; repeated boots rebuild the compatibility gate.
  policy = new PermissionPolicy(fixtures, roles);
}

export function permissionsForRole(
  id: string,
  name: string,
): readonly StaticPermission[] | undefined {
  return policy?.permissionsForRole(id, name);
}
