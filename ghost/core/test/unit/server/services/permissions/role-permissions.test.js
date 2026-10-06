const assert = require('node:assert/strict');
const rolePermissions = require('../../../../../core/server/services/permissions/role-permissions');

const keyOf = (perm) => `${perm.action_type}:${perm.object_type}`;
const hasPair = (perms, action, object) =>
  perms.some((perm) => perm.action_type === action && perm.object_type === object);

describe('Role Permissions', function () {
  describe('forRoles', function () {
    it('expands an "all" relation value to every permission for that object type', function () {
      // Contributor has `slug: 'all'`, and the only slug permission is generate:slug
      const perms = rolePermissions.forRoles(['Contributor']);
      assert(hasPair(perms, 'generate', 'slug'));
    });

    it('expands an array relation value to the listed actions only', function () {
      // Contributor has `post: ['browse', 'read', 'edit', 'add', 'destroy']` (no publish)
      const perms = rolePermissions.forRoles(['Contributor']);
      assert(hasPair(perms, 'edit', 'post'));
      assert(!hasPair(perms, 'publish', 'post'));
    });

    it('expands a single string relation value to that one action', function () {
      // Contributor has `email_preview: 'read'`; sendTestEmail:email_preview also exists
      const perms = rolePermissions.forRoles(['Contributor']);
      assert(hasPair(perms, 'read', 'email_preview'));
      assert(!hasPair(perms, 'sendTestEmail', 'email_preview'));
    });

    it('returns an empty array for an unknown role', function () {
      assert.deepEqual(rolePermissions.forRoles(['NotARealRole']), []);
    });

    it('returns an empty array for Owner (not in the relation; relies on the bypass)', function () {
      assert.deepEqual(rolePermissions.forRoles(['Owner']), []);
    });

    it('unions multiple roles without duplicates', function () {
      const perms = rolePermissions.forRoles(['Contributor', 'Author']);
      const keys = perms.map(keyOf);
      assert.equal(keys.length, new Set(keys).size, 'result contains duplicate permission pairs');

      // The union is a superset of each role on its own
      const contributor = rolePermissions.forRoles(['Contributor']);
      for (const perm of contributor) {
        assert(hasPair(perms, perm.action_type, perm.object_type));
      }
    });

    it('expands each role to the expected number of permissions', function () {
      const counts = {
        Administrator: 139,
        'Admin Integration': 117,
        'Super Editor': 74,
        Editor: 54,
        Author: 31,
        Contributor: 22,
        'DB Backup Integration': 6,
        'Scheduler Integration': 4,
        'Self-Serve Migration Integration': 4,
      };

      for (const [role, count] of Object.entries(counts)) {
        assert.equal(
          rolePermissions.forRoles([role]).length,
          count,
          `expected ${count} permissions for ${role}`,
        );
      }
    });
  });

  describe('all', function () {
    it('returns every permission pair from the fixtures', function () {
      const perms = rolePermissions.all();
      assert.equal(perms.length, 142);

      const keys = perms.map(keyOf);
      assert.equal(keys.length, new Set(keys).size, 'all() contains duplicate permission pairs');

      assert(perms[0] && 'action_type' in perms[0] && 'object_type' in perms[0]);
    });
  });
});
