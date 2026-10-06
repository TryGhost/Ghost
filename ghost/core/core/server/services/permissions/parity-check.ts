import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import { permissionKey, permissionSchema, RolePermissions } from './role-permissions';
import type { Permission } from './role-permissions';

const snapshotSchema = z.object({
  roles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      permissions: z.array(permissionSchema),
    }),
  ),
  permissions: z.array(permissionSchema),
  directUserGrants: z.coerce.number().int().nonnegative(),
});

function difference(database: readonly Permission[], memory: readonly Permission[]) {
  const actual = new Map(database.map((p) => [permissionKey(p), p]));
  const expected = new Map(memory.map((p) => [permissionKey(p), p]));
  return {
    wouldGrant: [...expected].filter(([key]) => !actual.has(key)).map(([, p]) => p),
    wouldRevoke: [...actual].filter(([key]) => !expected.has(key)).map(([, p]) => p),
  };
}

export function compare(policy: RolePermissions, input: unknown) {
  const snapshot = snapshotSchema.parse(input);
  const roles = snapshot.roles
    .map((role) => ({
      id: role.id,
      name: role.name,
      ...difference(role.permissions, policy.forRoles([role.name])),
    }))
    .filter((role) => role.wouldGrant.length || role.wouldRevoke.length);
  const unknownRoles = snapshot.roles
    .filter((role) => !policy.hasRole(role.name))
    .map(({ id, name }) => ({ id, name }));
  const catalog = difference(snapshot.permissions, policy.all());
  return {
    matches:
      !roles.length &&
      !unknownRoles.length &&
      !snapshot.directUserGrants &&
      !catalog.wouldGrant.length &&
      !catalog.wouldRevoke.length,
    roleCount: snapshot.roles.length,
    roles,
    unknownRoles,
    catalog,
    directUserGrants: snapshot.directUserGrants,
  };
}

export async function check(policy: RolePermissions, load: () => Promise<unknown>): Promise<void> {
  try {
    const report = compare(policy, await load());
    const fields = { policyVersion: policy.version, errorDetails: JSON.stringify(report) };
    if (report.matches) {
      logging.info(
        { ...fields, code: 'PERMISSIONS_PARITY_MATCH' },
        'Permissions parity check passed',
      );
    } else {
      logging.warn(
        { ...fields, code: 'PERMISSIONS_PARITY_MISMATCH' },
        'Database permissions differ from the static policy',
      );
    }
  } catch (err) {
    logging.error(
      new errors.InternalServerError({
        message: 'Permissions parity check failed',
        code: 'PERMISSIONS_PARITY_CHECK_FAILED',
        errorDetails: JSON.stringify({ policyVersion: policy.version }),
        err: err instanceof Error ? err : String(err),
      }),
    );
  }
}

export const parityCheck = { check };
