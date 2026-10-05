import assert from 'node:assert/strict';
import { z } from 'zod';
import { PermissionPolicy } from '../../../../../core/server/services/permissions/policy';
import fixtures from '../../../../../core/server/data/schema/fixtures/fixtures.json';

const browsePost = { name: 'Browse posts', action_type: 'browse', object_type: 'post' };
const editPost = { name: 'Edit posts', action_type: 'edit', object_type: 'post' };
const editTag = { name: 'Edit tags', action_type: 'edit', object_type: 'tag' };

const customFixtures = {
  models: [
    { name: 'Permission', entries: [browsePost, editPost, editTag] },
    { name: 'Role', entries: [{ name: 'Writer' }, { name: 'Reader' }, { name: 'Owner' }] },
  ],
  relations: [
    {
      from: { model: 'Role' },
      to: { model: 'Permission' },
      entries: { Writer: { post: 'all', tag: ['edit'] }, Reader: { post: 'browse' } },
    },
  ],
};

describe('PermissionPolicy', function () {
  it('compiles string, array and all grants against the configured catalog', function () {
    const policy = new PermissionPolicy(customFixtures, [
      { id: 'writer', name: 'Writer', permissions: [browsePost, editPost, editTag] },
      { id: 'reader', name: 'Reader', permissions: [browsePost] },
      { id: 'owner', name: 'Owner', permissions: [] },
    ]);

    assert.deepEqual(
      policy.permissionsForRole('writer', 'Writer')?.map((permission) => permission.get('name')),
      ['Browse posts', 'Edit posts', 'Edit tags'],
    );
    assert.deepEqual(
      policy.permissionsForRole('reader', 'Reader')?.map((permission) => permission.get('name')),
      ['Browse posts'],
    );
    assert.deepEqual(policy.permissionsForRole('owner', 'Owner'), []);
  });

  it('leaves missing, extra, object-specific and unknown grants on the database path', function () {
    const policy = new PermissionPolicy(customFixtures, [
      { id: 'missing', name: 'Writer', permissions: [browsePost] },
      { id: 'extra', name: 'Reader', permissions: [browsePost, editPost] },
      { id: 'object', name: 'Reader', permissions: [{ ...browsePost, object_id: 'one-post' }] },
      { id: 'unknown', name: 'Custom', permissions: [browsePost] },
    ]);

    for (const [id, name] of [
      ['missing', 'Writer'],
      ['extra', 'Reader'],
      ['object', 'Reader'],
      ['unknown', 'Custom'],
    ]) {
      assert.equal(policy.permissionsForRole(id, name), undefined);
    }
  });

  it('does not trust an unaudited role ID or a role renamed after boot', function () {
    const policy = new PermissionPolicy(customFixtures, [
      { id: 'reader', name: 'Reader', permissions: [browsePost] },
    ]);
    assert.equal(policy.permissionsForRole('new-reader', 'Reader'), undefined);
    assert.equal(policy.permissionsForRole('reader', 'Writer'), undefined);
  });

  it('owns immutable values independent of fixture and database mutations', function () {
    const input = structuredClone(customFixtures);
    const policy = new PermissionPolicy(input, [
      { id: 'reader', name: 'Reader', permissions: [browsePost] },
    ]);
    const permissions = policy.permissionsForRole('reader', 'Reader');
    assert(permissions);
    assert(Object.isFrozen(permissions));
    assert(Object.isFrozen(permissions[0]));
    input.models[0].entries[0].name = 'Changed';
    assert.equal(permissions[0].get('name'), 'Browse posts');
    const action: string = permissions[0].get('action_type');
    const objectId: string | null = permissions[0].get('object_id');
    assert.equal(action, 'browse');
    assert.equal(objectId, null);
    assert.throws(
      // @ts-expect-error Only schema-defined permission fields are accepted.
      () => permissions[0].get('toString'),
      { errorType: 'InternalServerError' },
    );
  });

  it('rejects malformed fixture grants and database roles at the boundary', function () {
    assert.throws(
      () => new PermissionPolicy({ ...customFixtures, models: 'invalid' }, []),
      z.ZodError,
    );
    assert.throws(
      () =>
        new PermissionPolicy(
          {
            ...customFixtures,
            relations: [{ ...customFixtures.relations[0], entries: { Writer: { post: 3 } } }],
          },
          [],
        ),
      z.ZodError,
    );
    assert.throws(
      () => new PermissionPolicy(customFixtures, [{ id: 3, name: 'Reader', permissions: [] }]),
      z.ZodError,
    );
    assert.throws(
      () => new PermissionPolicy(customFixtures, [{ id: 'reader', name: 'Reader' }]),
      z.ZodError,
    );
  });

  it('keeps separately constructed instance policies independent', function () {
    const first = new PermissionPolicy(customFixtures, [
      { id: 'reader', name: 'Reader', permissions: [browsePost] },
    ]);
    const second = new PermissionPolicy(customFixtures, [
      { id: 'reader', name: 'Reader', permissions: [] },
    ]);
    assert.equal(first.permissionsForRole('reader', 'Reader')?.length, 1);
    assert.equal(second.permissionsForRole('reader', 'Reader'), undefined);
  });

  it('matches the legacy fixture matcher for every built-in role and permission', function () {
    // Use the existing seeder's matching behavior as the independent reference.
    const FixtureManager = require('../../../../../core/server/data/schema/fixtures/fixture-manager');
    const models = require('../../../../../core/server/models');
    const definitions = fixtures.models.find((model) => model.name === 'Permission');
    const roleDefinitions = fixtures.models.find((model) => model.name === 'Role');
    const relation = fixtures.relations.find((entry) => entry.from.model === 'Role');
    assert(definitions && roleDefinitions && relation);

    const permissions = models.Permissions.forge(definitions.entries);
    const roleEntries = z.array(z.object({ name: z.string() })).parse(roleDefinitions.entries);
    const grants = z
      .record(z.string(), z.record(z.string(), z.union([z.string(), z.array(z.string())])))
      .parse(relation.entries);
    const roles = roleEntries.map((role, index) => ({
      id: `role-${index}`,
      name: role.name,
      permissions: Object.entries(grants[role.name] ?? {}).flatMap(([object, actions]) =>
        permissions
          .filter(FixtureManager.matchFunc(relation.to.match, object, actions))
          .map((permission: { toJSON: () => unknown }) => permission.toJSON()),
      ),
    }));
    const policy = new PermissionPolicy(fixtures, roles);

    for (const role of roles) {
      const actual = policy.permissionsForRole(role.id, role.name);
      assert(actual, `${role.name} must use the memory policy`);
      assert.deepEqual(
        actual.map((permission) => permission.get('name')).sort(),
        role.permissions.map((permission: { name: string }) => permission.name).sort(),
      );
    }
  });
});
