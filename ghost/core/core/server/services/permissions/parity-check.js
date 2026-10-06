const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const models = require('../../models');
const db = require('../../data/db');
const rolePermissions = require('./role-permissions');

// Owner is a bypass in can-this.js, is not in the static map, and holds no
// permission rows in the database. It is skipped by the parity check.
const OWNER = 'Owner';

function keyOf(perm) {
  return `${perm.action_type}:${perm.object_type}`;
}

function dbRoleKeys(role) {
  return new Set(
    role
      .related('permissions')
      .models.map((perm) => `${perm.get('action_type')}:${perm.get('object_type')}`),
  );
}

async function countPermissionsUsers() {
  const result = await db.knex('permissions_users').count('* as count');
  return Number(result[0].count);
}

// Compares the database permissions against the in-memory map once, at boot, and
// logs any difference so the switch to the map can be made with evidence. It
// wraps everything and never throws: a parity check must not stop Ghost booting.
async function checkParity() {
  try {
    const [roles, permissions, permissionsUsersCount] = await Promise.all([
      models.Role.findAll({withRelated: ['permissions']}),
      models.Permission.findAll(),
      // Called through module.exports so it can be stubbed in tests.
      module.exports.countPermissionsUsers(),
    ]);

    const roleDiffs = [];
    const unknownRoles = [];

    // Iterate the database roles (not the static map), so a role that only
    // exists in the database is still reported.
    for (const role of roles.models) {
      const name = role.get('name');
      if (name === OWNER) {
        continue;
      }

      const mapPerms = rolePermissions.forRoles([name]);
      if (mapPerms.length === 0) {
        unknownRoles.push(name);
      }

      const mapKeys = new Set(mapPerms.map(keyOf));
      const dbKeys = dbRoleKeys(role);

      const wouldRevoke = [...dbKeys].filter((key) => !mapKeys.has(key));
      const wouldGrant = [...mapKeys].filter((key) => !dbKeys.has(key));

      if (wouldRevoke.length || wouldGrant.length) {
        roleDiffs.push({role: name, wouldRevoke, wouldGrant});
      }
    }

    // Every database permission pair must exist in the map, otherwise
    // canThis(ctx)[action][object] would be undefined after cutover.
    const mapAllKeys = new Set(rolePermissions.all().map(keyOf));
    const missingPairs = permissions.models
      .map((perm) => `${perm.get('action_type')}:${perm.get('object_type')}`)
      .filter((key) => !mapAllKeys.has(key));

    const hasDrift =
      roleDiffs.length > 0 ||
      unknownRoles.length > 0 ||
      missingPairs.length > 0 ||
      permissionsUsersCount > 0;

    if (!hasDrift) {
      logging.info('Permissions parity check passed');
      return;
    }

    logging.error(
      new errors.InternalServerError({
        message: 'Database permissions do not match the in-memory role permissions map',
        code: 'PERMISSIONS_PARITY_MISMATCH',
        errorDetails: {
          roleDiffs,
          unknownRoles,
          missingPairs,
          permissionsUsersCount,
        },
      }),
    );
  } catch (err) {
    // Never throw during boot: a parity check failure must not stop Ghost.
    logging.error(err);
  }
}

module.exports = {checkParity, countPermissionsUsers};
