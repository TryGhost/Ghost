import { permissions as permissionData } from '../permissions/permissions-data';
import * as rolePermissions from '../permissions/role-permissions';
import type { Principal, RoleView, Scopes } from '../principal';

/** An `object_type:action` key, such as `post:edit`. */
export type Capability = `${string}:${string}`;

export interface Capabilities {
  /** The keys the principal's roles grant, or an app's scopes when it has no user */
  granted: ReadonlySet<Capability>;
  /** The keys its token and app scopes allow, or `unlimited` when it has neither */
  scopes: ReadonlySet<Capability> | 'unlimited';
}

export function capabilityKey(objectType: string, action: string): Capability {
  return `${objectType}:${action}`;
}

const ALL: ReadonlySet<Capability> = new Set(
  Object.entries(permissionData).flatMap(([objectType, actions]) =>
    actions.map((action) => capabilityKey(objectType, action)),
  ),
);

const NONE: ReadonlySet<Capability> = new Set();

// Grants are code, so each role's keys are built once at import
const byRole = new Map<string, ReadonlySet<Capability>>(
  rolePermissions
    .roleNames()
    .map((name) => [
      name,
      new Set(
        rolePermissions
          .forRoles([name])
          .map((perm) => capabilityKey(perm.object_type, perm.action_type)),
      ),
    ]),
);

function roleGrants(roles: readonly string[]): ReadonlySet<Capability> {
  return roles.reduce((all, role) => all.union(byRole.get(role) ?? NONE), NONE);
}

/** A staff user's grants; Owner is granted every key. */
function staffGrants(roles: readonly string[]): ReadonlySet<Capability> {
  return roles.includes('Owner') ? ALL : roleGrants(roles);
}

/** Scopes as exact keys; `post:*` expands to every action of that type. */
function toKeys(scopes: Scopes | null | undefined): ReadonlySet<Capability> {
  // Missing scopes allow nothing, whatever the type promises
  if (!Array.isArray(scopes)) {
    return NONE;
  }
  return new Set(
    scopes.flatMap((scope): Capability[] => {
      const parts = scope.split(':');
      // Only a whole `type:*` is a wildcard; anything else must match a key exactly
      if (parts.length !== 2 || parts[1] !== '*') {
        return [scope as Capability];
      }
      const [objectType] = parts;
      const actions: readonly string[] = Object.hasOwn(permissionData, objectType)
        ? permissionData[objectType as keyof typeof permissionData]
        : [];
      return actions.map((each) => capabilityKey(objectType, each));
    }),
  );
}

const names = (roles: readonly RoleView[]) => roles.map((role) => role.name);

function granted(principal: Principal): ReadonlySet<Capability> {
  switch (principal.kind) {
    case 'internal':
      return ALL;
    case 'anonymous':
      return NONE;
    case 'user':
      return staffGrants(names(principal.user.roles));
    // A legacy key takes its integration role's grants, with no Owner bypass
    case 'integration':
      return principal.apiKey.role ? roleGrants([principal.apiKey.role.name]) : NONE;
    // With no user to act for, an app is granted exactly its scopes
    case 'app':
      return principal.actingFor
        ? staffGrants(names(principal.actingFor.roles))
        : toKeys(principal.scopes);
    // A kind this doesn't know is granted nothing
    default:
      return NONE;
  }
}

// Only one scope source exists per principal today; app tokens will intersect theirs here
function scopeLimit(principal: Principal): Capabilities['scopes'] {
  switch (principal.kind) {
    case 'internal':
    case 'anonymous':
      return 'unlimited';
    // An app is always scoped, so missing scopes mean no access rather than none to apply
    case 'app':
      return toKeys(principal.scopes);
    case 'user':
    case 'integration':
      return principal.scopes ? toKeys(principal.scopes) : 'unlimited';
    // A kind this doesn't know is allowed nothing, rather than left unscoped
    default:
      return NONE;
  }
}

// Keyed on the principal object, which is frozen once per request
const memo = new WeakMap<Principal, Capabilities>();

/** The keys the principal is granted and the keys its scopes allow. */
export function capabilities(principal: Principal): Capabilities {
  let result = memo.get(principal);

  if (!result) {
    result = Object.freeze({ granted: granted(principal), scopes: scopeLimit(principal) });
    memo.set(principal, result);
  }

  return result;
}
