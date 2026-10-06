import assert from 'node:assert/strict';
import { z } from 'zod';
import type { RoleGrants } from '../../../../../core/server/services/permissions/definitions';

const rolePermissions: typeof import('../../../../../core/server/services/permissions/role-permissions') = require('../../../../../core/server/services/permissions/role-permissions');
const { RolePermissions, permissionSchema } = rolePermissions;
const {
  definitions,
}: typeof import('../../../../../core/server/services/permissions/definitions') = require('../../../../../core/server/services/permissions/definitions');
const {
  withPermissionFixtures,
}: typeof import('../../../../../core/server/data/schema/fixtures/permission-fixtures') = require('../../../../../core/server/data/schema/fixtures/permission-fixtures');
const FixtureManager = require('../../../../../core/server/data/schema/fixtures/fixture-manager');

function policyInput() {
  return {
    permissions: [
      { action_type: 'read', object_type: 'post' },
      { action_type: 'edit', object_type: 'post' },
      { action_type: 'read', object_type: 'tag' },
      { action_type: 'edit', object_type: 'tag' },
    ],
    roles: ['Writer', 'Reader', 'Owner'],
    grants: {
      Writer: { post: 'all', tag: ['read'] },
      Reader: { post: 'read' },
    },
  };
}

describe('Static role permissions', function () {
  afterEach(function () {
    rolePermissions.init();
  });

  it('keeps the authored definitions immutable before boot and seeding', function () {
    assert(Object.isFrozen(definitions));
    assert(Object.isFrozen(definitions.roles));
    assert(Object.isFrozen(definitions.permissions));
    assert(Object.isFrozen(definitions.grants));
    for (const permission of definitions.permissions) {
      assert(Object.isFrozen(permission));
    }
    for (const objects of Object.values(definitions.grants)) {
      assert(Object.isFrozen(objects));
      for (const actions of Object.values(objects)) {
        if (Array.isArray(actions)) {
          assert(Object.isFrozen(actions));
        }
      }
    }
    assert.throws(() => {
      // @ts-expect-error Authored grants are readonly at compile time and runtime.
      definitions.grants.Author.post[0] = 'publish';
    }, TypeError);
  });

  it('rejects object/action mismatches and role typos in types and boot validation', function () {
    const invalidAction: Partial<RoleGrants> = {
      Author: {
        // @ts-expect-error Assign is a role action, not a post action.
        post: 'assign',
      },
    };
    assert.throws(
      () => new RolePermissions({ ...definitions, grants: invalidAction }),
      /unknown grant/,
    );
    const invalidRole: Partial<RoleGrants> = {
      // @ts-expect-error Grant keys must name an existing role.
      Adminstrator: { post: 'all' },
    };
    assert.throws(
      () => new RolePermissions({ ...definitions, grants: invalidRole }),
      /unknown role/,
    );
  });
  it('requires explicit initialization before use', function () {
    const path =
      require.resolve('../../../../../core/server/services/permissions/role-permissions');
    const previous = require.cache[path];
    delete require.cache[path];
    try {
      const fresh: typeof rolePermissions = require(path);
      assert.throws(() => fresh.all(), /initialized during boot/);
      assert.throws(() => fresh.forRoles(['Writer']), /initialized during boot/);
    } finally {
      require.cache[path] = previous;
    }
  });

  it('expands finite all, array and single grants, unions roles, and denies unknown roles', function () {
    const policy = new RolePermissions(policyInput());
    assert.equal(policy.all().length, 4);
    assert.deepEqual(policy.forRoles(['Writer']), policy.all().slice(0, 3));
    assert.deepEqual(policy.forRoles(['Reader']), [policy.all()[0]]);
    assert.deepEqual(policy.forRoles(['Writer', 'Reader', 'Writer']), policy.forRoles(['Writer']));
    assert.deepEqual(policy.forRoles(['Unknown', 'Owner']), []);
    assert.deepEqual(policy.forRoles([]), []);
    assert(policy.hasRole('Owner'));
    assert(!policy.hasRole('Unknown'));
  });

  it('copies and freezes policy values and arrays', function () {
    const input = policyInput();
    const policy = new RolePermissions(input);
    input.permissions.length = 0;
    input.grants.Reader.post = 'all';
    assert.equal(policy.all().length, 4);
    assert.equal(policy.forRoles(['Reader']).length, 1);
    assert(Object.isFrozen(policy));
    assert(Object.isFrozen(policy.all()));
    assert(Object.isFrozen(policy.forRoles(['Reader', 'Writer'])));
    assert.throws(() => {
      // @ts-expect-error Policy grants are readonly at compile time and runtime.
      policy.all()[0].action_type = 'destroy';
    }, TypeError);
  });

  it('rejects malformed schemas, missing sections and unknown grant references', function () {
    assert.throws(() => new RolePermissions({}), z.ZodError);
    const malformed = policyInput();
    malformed.permissions[0] = { action_type: '', object_type: 'post' };
    assert.throws(() => new RolePermissions(malformed), z.ZodError);
    assert.throws(() => new RolePermissions({ permissions: [] }), z.ZodError);
    const typo = policyInput();
    typo.grants.Reader.post = 'publish';
    assert.throws(() => new RolePermissions(typo), /unknown grant/);
    const unknown = policyInput();
    unknown.roles.pop();
    unknown.roles.pop();
    assert.throws(() => new RolePermissions(unknown), /unknown role/);
  });

  it('publishes only successful initialization and produces a stable version', function () {
    const first = rolePermissions.init(policyInput());
    const values = rolePermissions.all();
    assert.throws(() => rolePermissions.init({}), z.ZodError);
    assert.equal(rolePermissions.all(), values);
    assert.equal(new RolePermissions(policyInput()).version, first.version);
    const changed = policyInput();
    changed.grants.Reader.post = 'all';
    assert.notEqual(new RolePermissions(changed).version, first.version);
    const next = rolePermissions.init(changed);
    assert.equal(rolePermissions.forRoles(['Reader']).length, 2);
    assert.equal(first.forRoles(['Reader']).length, 1);
    assert.equal(next.forRoles(['Reader']).length, 2);
  });

  it.each([
    '../../../../../core/server/data/schema/fixtures/fixtures.json',
    '../../../../utils/fixtures/fixtures.json',
  ])('matches the legacy fixture matcher for every role in %s', function (path) {
    const input = withPermissionFixtures(require(path));
    const policy = new RolePermissions();
    const permissions = z
      .array(permissionSchema)
      .parse(input.models.find((m: { name: string }) => m.name === 'Permission')?.entries);
    const grants = input.relations.find(
      (r: { from: { model: string }; to: { model: string } }) =>
        r.from.model === 'Role' && r.to.model === 'Permission',
    )?.entries;
    const grantEntries = z.record(z.string(), z.record(z.string(), z.unknown())).parse(grants);
    const roles = z
      .array(z.object({ name: z.string() }))
      .parse(input.models.find((m: { name: string }) => m.name === 'Role')?.entries);
    assert.deepEqual(roles.map(({ name }) => name).sort(), [...definitions.roles].sort());
    for (const { name } of roles) {
      const expected = permissions.filter((permission) =>
        Object.entries(grantEntries[name] ?? {}).some(([object, actions]) =>
          FixtureManager.matchFunc(
            ['object_type', 'action_type'],
            object,
            actions,
          )({ get: (key: keyof typeof permission) => permission[key] }),
        ),
      );
      assert.deepEqual(policy.forRoles([name]), expected, name);
    }
  });
});
