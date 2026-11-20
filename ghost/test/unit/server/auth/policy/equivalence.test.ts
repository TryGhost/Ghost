import assert from 'node:assert/strict';
import { authorize } from '../../../../../core/server/auth/policy/authorize';
import { getGrantFlags } from '../../../../../core/server/auth/permissions/can-this';
import { permissions as permissionData } from '../../../../../core/server/auth/permissions/permissions-data';
import * as rolePermissions from '../../../../../core/server/auth/permissions/role-permissions';
import type { Permission } from '../../../../../core/server/auth/permissions/role-permissions';
import type { Principal } from '../../../../../core/server/auth/principal';

/** What canThis loaded for each actor before the policy core */
interface LoadedActors {
  user: { permissions: Permission[]; roles: Array<{ name: string }> } | null;
  apiKey: { permissions: Permission[]; roles: Array<{ name: string } | null> } | null;
}

// canThis' grant check before the policy core, kept verbatim apart from lodash
function legacyGrantFlags(loaded: LoadedActors, actType: string, objType: string) {
  const userPermissions = loaded.user ? loaded.user.permissions : null;
  const apiKeyPermissions = loaded.apiKey ? loaded.apiKey.permissions : null;

  let hasUserPermission: boolean | undefined;
  let hasApiKeyPermission: boolean;

  const checkPermission = (perm: Permission) =>
    perm.action_type === actType && perm.object_type === objType;

  const isOwner = Boolean(loaded.user?.roles?.some((role) => role.name === 'Owner'));
  if (isOwner) {
    hasUserPermission = true;
  } else if (userPermissions && userPermissions.length > 0) {
    hasUserPermission = userPermissions.some(checkPermission);
  }

  hasApiKeyPermission = true;
  if (apiKeyPermissions !== null) {
    if (loaded.user) {
      hasApiKeyPermission = true;
    } else {
      hasUserPermission = true;
      hasApiKeyPermission = apiKeyPermissions.some(checkPermission);
    }
  }

  return { hasUserPermission, hasApiKeyPermission };
}

// What the removed providers loaded for these role names
function loadUser(roles: string[]) {
  return { permissions: rolePermissions.forRoles(roles), roles: roles.map((name) => ({ name })) };
}

function loadApiKey(role: string | null) {
  return {
    permissions: role ? rolePermissions.forRoles([role]) : [],
    roles: [role ? { name: role } : null],
  };
}

const userView = (roles: string[]) =>
  Object.freeze({
    id: '1',
    email: 'a@example.com',
    name: 'A',
    status: 'active',
    roles: roles.map((name) => ({ id: `role-${name}`, name })),
  });
const keyView = (type: string, role: string | null) =>
  Object.freeze({
    id: 'key',
    type,
    user_id: null,
    integration_id: 'integration',
    role: role ? { id: `role-${role}`, name: role } : null,
  });

// Apps are always scoped; with every key in scope, the cap changes nothing
const everyKey = Object.entries(permissionData).flatMap(([objectType, actions]) =>
  actions.map((action) => `${objectType}:${action}`),
);

const staffRoles = ['Owner', 'Administrator', 'Super Editor', 'Editor', 'Author', 'Contributor'];
const integrationRoles = rolePermissions.roleNames().filter((name) => name.endsWith('Integration'));

interface Case {
  name: string;
  principal: Principal;
  /** What canThis loaded for the same request before */
  legacy: LoadedActors;
}

const cases: Case[] = [];

for (const role of [...staffRoles, ...integrationRoles, 'Unknown Role']) {
  const user = loadUser([role]);
  cases.push({
    name: `${role} session`,
    principal: { kind: 'user', method: 'session', user: userView([role]) },
    legacy: { user, apiKey: null },
  });
  // A staff token's key has no role; canThis used to load it anyway
  cases.push({
    name: `${role} staff token`,
    principal: {
      kind: 'user',
      method: 'staff_token',
      user: userView([role]),
      apiKey: { ...keyView('admin', null), user_id: '1', integration_id: null },
    },
    legacy: { user, apiKey: loadApiKey(null) },
  });
  cases.push({
    name: `app acting for ${role}, scoped to every key`,
    principal: {
      kind: 'app',
      method: 'oauth_authorization_code',
      app: { id: 'installation' },
      actingFor: userView([role]),
      scopes: everyKey,
    },
    legacy: { user, apiKey: null },
  });
}

cases.push({
  name: 'user with no roles',
  principal: { kind: 'user', method: 'session', user: userView([]) },
  legacy: { user: loadUser([]), apiKey: null },
});

// Ghost gives a user one role, but roles_users allows several; grants are their union
const everyRole = [...staffRoles, ...integrationRoles, 'Unknown Role'];
const roleSets = everyRole.flatMap((first, i) =>
  everyRole.slice(i + 1).map((second) => [first, second]),
);
roleSets.push(['Editor', 'Author', 'Editor'], ['Contributor', 'Owner', 'Author']);
for (const roles of roleSets) {
  cases.push({
    name: `user with roles ${roles.join(' + ')}`,
    principal: { kind: 'user', method: 'session', user: userView(roles) },
    legacy: { user: loadUser(roles), apiKey: null },
  });
}

for (const role of [...integrationRoles, ...staffRoles, 'Unknown Role']) {
  cases.push({
    name: `${role} admin key`,
    principal: {
      kind: 'integration',
      method: 'admin_api_key',
      apiKey: keyView('admin', role),
      integration: null,
    },
    legacy: { user: null, apiKey: loadApiKey(role) },
  });
}

cases.push({
  name: 'content key',
  principal: {
    kind: 'integration',
    method: 'content_api_key',
    apiKey: keyView('content', null),
    integration: null,
  },
  legacy: { user: null, apiKey: loadApiKey(null) },
});
cases.push({
  name: 'anonymous',
  principal: { kind: 'anonymous' },
  legacy: { user: null, apiKey: null },
});

const checks = Object.entries(permissionData).flatMap(([objectType, actions]) =>
  actions.map((action) => [action, objectType] as const),
);

describe('Authorization policy equivalence with the legacy grant check', function () {
  for (const { name, principal, legacy: legacyLoaded } of cases) {
    it(name, async function () {
      const mismatches: string[] = [];

      for (const [action, objectType] of checks) {
        const legacy = legacyGrantFlags(legacyLoaded, action, objectType);
        const flags = getGrantFlags(principal, action, objectType);
        const allowed = await authorize(principal, action, objectType).then(
          () => true,
          () => false,
        );

        // Hooks read the flags by truthiness, so undefined and false are the same answer
        if (
          flags.hasUserPermission !== Boolean(legacy.hasUserPermission) ||
          flags.hasApiKeyPermission !== legacy.hasApiKeyPermission ||
          allowed !== Boolean(legacy.hasUserPermission && legacy.hasApiKeyPermission)
        ) {
          mismatches.push(`${objectType}:${action}`);
        }
      }

      assert.deepEqual(mismatches, []);
    });
  }

  // canThis resolves internal requests before the grant check; policy gives the same answer
  it('internal', async function () {
    const principal: Principal = { kind: 'internal' };
    for (const [action, objectType] of checks) {
      assert.deepEqual(await authorize(principal, action, objectType), {});
    }
  });

  it('covers every check canThis exposes', function () {
    const covered = new Set(checks.map(([action, objectType]) => `${objectType}:${action}`));
    for (const [action, objectTypes] of Object.entries(rolePermissions.actionsMap)) {
      for (const objectType of objectTypes) {
        assert(covered.has(`${objectType}:${action}`), `${objectType}:${action}`);
      }
    }
  });
});
