const assert = require('node:assert/strict');
const testUtils = require('../../../utils');
const models = require('../../../../core/server/models');
const rolePermissions = require('../../../../core/server/services/permissions/role-permissions');

// Independent check that our in-memory expansion matches what the real
// FixtureManager seeds into the database through matchFunc. Without this the
// unit test only checks role-permissions.js against its own copy of the logic.
const keyOf = (perm) => `${perm.action_type}:${perm.object_type}`;
const sortedKeys = (perms) => perms.map(keyOf).sort();

describe('Integration: role-permissions', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('default'));
  afterAll(testUtils.teardownDb);

  it('forRoles equals the database permissions for every role', async function () {
    const roles = await models.Role.findAll({ withRelated: ['permissions'] });

    assert(roles.models.length > 0, 'expected the default fixtures to seed roles');

    for (const role of roles.models) {
      const name = role.get('name');
      const dbKeys = sortedKeys(
        role.related('permissions').models.map((perm) => ({
          action_type: perm.get('action_type'),
          object_type: perm.get('object_type'),
        })),
      );
      const mapKeys = sortedKeys(rolePermissions.forRoles([name]));

      assert.deepEqual(mapKeys, dbKeys, `permissions mismatch for role "${name}"`);
    }
  });

  it('all() equals every permission row in the database', async function () {
    const permissions = await models.Permission.findAll();

    const dbKeys = sortedKeys(
      permissions.models.map((perm) => ({
        action_type: perm.get('action_type'),
        object_type: perm.get('object_type'),
      })),
    );
    const mapKeys = sortedKeys(rolePermissions.all());

    assert.deepEqual(mapKeys, dbKeys);
  });
});
