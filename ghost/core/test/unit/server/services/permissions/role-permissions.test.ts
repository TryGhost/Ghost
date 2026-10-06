import assert from 'node:assert/strict';
import { z } from 'zod';

const rolePermissions: typeof import('../../../../../core/server/services/permissions/role-permissions') = require('../../../../../core/server/services/permissions/role-permissions');
const { RolePermissions, permissionSchema } = rolePermissions;
const FixtureManager = require('../../../../../core/server/data/schema/fixtures/fixture-manager');

function fixtures() {
  return {
    models: [
      {
        name: 'Permission',
        entries: [
          { action_type: 'read', object_type: 'post' },
          { action_type: 'edit', object_type: 'post' },
          { action_type: 'read', object_type: 'tag' },
          { action_type: 'edit', object_type: 'tag' },
        ],
      },
      { name: 'Role', entries: [{ name: 'Writer' }, { name: 'Reader' }, { name: 'Owner' }] },
    ],
    relations: [
      {
        from: { model: 'Role' },
        to: { model: 'Permission' },
        entries: {
          Writer: { post: 'all', tag: ['read'] },
          Reader: { post: 'read' },
        },
      },
    ],
  };
}

describe('Static role permissions', function () {
  afterEach(function () {
    const config = require('../../../../../core/shared/config');
    rolePermissions.init(require(config.get('paths').fixtures));
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
    const policy = new RolePermissions(fixtures());
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
    const input = fixtures();
    const policy = new RolePermissions(input);
    input.models[0].entries.length = 0;
    input.relations[0].entries.Reader.post = 'all';
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
    const malformed = fixtures();
    malformed.models[0].entries[0] = { action_type: '', object_type: 'post' };
    assert.throws(() => new RolePermissions(malformed), z.ZodError);
    const missing = fixtures();
    missing.models.pop();
    assert.throws(() => new RolePermissions(missing), /requires permission, role/);
    const typo = fixtures();
    typo.relations[0].entries.Reader.post = 'publish';
    assert.throws(() => new RolePermissions(typo), /unknown grant/);
    const unknown = fixtures();
    unknown.models[1].entries.pop();
    unknown.models[1].entries.pop();
    assert.throws(() => new RolePermissions(unknown), /unknown role/);
  });

  it('publishes only successful initialization and produces a stable version', function () {
    const first = rolePermissions.init(fixtures());
    const values = rolePermissions.all();
    assert.throws(() => rolePermissions.init({}), z.ZodError);
    assert.equal(rolePermissions.all(), values);
    assert.equal(new RolePermissions(fixtures()).version, first.version);
    const changed = fixtures();
    changed.relations[0].entries.Reader.post = 'all';
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
    const input = require(path);
    const policy = new RolePermissions(input);
    const permissions = z
      .array(permissionSchema)
      .parse(input.models.find((m: { name: string }) => m.name === 'Permission').entries);
    const grants = input.relations.find(
      (r: { from: { model: string }; to: { model: string } }) =>
        r.from.model === 'Role' && r.to.model === 'Permission',
    ).entries;
    const roles = z
      .array(z.object({ name: z.string() }))
      .parse(input.models.find((m: { name: string }) => m.name === 'Role').entries);
    for (const { name } of roles) {
      const expected = permissions.filter((permission) =>
        Object.entries(grants[name] ?? {}).some(([object, actions]) =>
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
