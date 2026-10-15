import assert from 'node:assert/strict';
import * as rolePermissions from '../../../../../core/server/services/permissions/role-permissions';

// Which roles hold each permission, as the "Fixtures > Populate" migration
// test checks for the seeded permissions_roles rows.
//
// Roles are listed in the order they are created in fixtures.json.
const ROLE_ORDER = [
  'Administrator',
  'Editor',
  'Author',
  'Contributor',
  'Owner',
  'Admin Integration',
  'Self-Serve Migration Integration',
  'DB Backup Integration',
  'Scheduler Integration',
  'Super Editor',
];

const GRANTS: [string, string, string[]][] = [
  ['browse', 'upgrade', ['Administrator']],
  ['read', 'upgrade', ['Administrator']],
  ['add', 'upgrade', ['Administrator']],
  ['exportContent', 'db', ['Administrator', 'DB Backup Integration']],
  [
    'importContent',
    'db',
    ['Administrator', 'Self-Serve Migration Integration', 'DB Backup Integration'],
  ],
  ['deleteAllContent', 'db', ['Administrator', 'DB Backup Integration']],
  ['importContent', 'content_import', ['Administrator', 'Self-Serve Migration Integration']],
  ['backupContent', 'db', ['Administrator', 'DB Backup Integration']],
  ['send', 'mail', ['Administrator', 'Admin Integration']],
  ['browse', 'notification', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['add', 'notification', ['Administrator', 'Admin Integration']],
  ['destroy', 'notification', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  [
    'browse',
    'post',
    [
      'Administrator',
      'Editor',
      'Author',
      'Contributor',
      'Admin Integration',
      'DB Backup Integration',
      'Super Editor',
    ],
  ],
  [
    'read',
    'post',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'edit',
    'post',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'add',
    'post',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'destroy',
    'post',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'publish',
    'post',
    ['Administrator', 'Editor', 'Admin Integration', 'Scheduler Integration', 'Super Editor'],
  ],
  ['flushReminders', 'gift', ['Scheduler Integration']],
  ['flushDeliveries', 'gift', ['Scheduler Integration']],
  ['manage', 'gift_link', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['removeAll', 'gift_link', ['Administrator']],
  ['browse', 'app_installation', ['Administrator']],
  ['read', 'app_installation', ['Administrator']],
  ['add', 'app_installation', ['Administrator']],
  ['destroy', 'app_installation', ['Administrator']],
  [
    'browse',
    'setting',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'read',
    'setting',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['edit', 'setting', ['Administrator', 'Admin Integration']],
  [
    'generate',
    'slug',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'browse',
    'tag',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'read',
    'tag',
    [
      'Administrator',
      'Editor',
      'Author',
      'Contributor',
      'Admin Integration',
      'Self-Serve Migration Integration',
      'Super Editor',
    ],
  ],
  ['edit', 'tag', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['add', 'tag', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']],
  ['destroy', 'tag', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  [
    'browse',
    'theme',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['edit', 'theme', ['Administrator', 'Admin Integration']],
  ['activate', 'theme', ['Administrator', 'Admin Integration']],
  [
    'readActive',
    'theme',
    ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor'],
  ],
  ['add', 'theme', ['Administrator', 'Admin Integration']],
  ['read', 'theme', ['Administrator', 'Admin Integration']],
  ['destroy', 'theme', ['Administrator', 'Admin Integration']],
  [
    'browse',
    'user',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'read',
    'user',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['edit', 'user', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['add', 'user', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['destroy', 'user', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['assign', 'role', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  [
    'browse',
    'role',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['browse', 'invite', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['read', 'invite', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['edit', 'invite', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['add', 'invite', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['destroy', 'invite', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['download', 'redirect', ['Administrator', 'Admin Integration']],
  ['upload', 'redirect', ['Administrator', 'Admin Integration']],
  ['add', 'webhook', ['Administrator', 'Admin Integration']],
  ['edit', 'webhook', ['Administrator', 'Admin Integration']],
  ['destroy', 'webhook', ['Administrator', 'Admin Integration']],
  ['browse', 'integration', ['Administrator']],
  ['read', 'integration', ['Administrator']],
  ['edit', 'integration', ['Administrator']],
  ['add', 'integration', ['Administrator']],
  ['destroy', 'integration', ['Administrator']],
  ['browse', 'api_key', ['Administrator']],
  ['read', 'api_key', ['Administrator']],
  ['edit', 'api_key', ['Administrator']],
  ['add', 'api_key', ['Administrator']],
  ['destroy', 'api_key', ['Administrator']],
  ['browse', 'action', ['Administrator', 'Admin Integration']],
  [
    'read',
    'email_preview',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'sendTestEmail',
    'email_preview',
    ['Administrator', 'Editor', 'Admin Integration', 'Super Editor'],
  ],
  ['browse', 'email', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  [
    'read',
    'email',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['retry', 'email', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  [
    'browse',
    'snippet',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'read',
    'snippet',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['edit', 'snippet', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['add', 'snippet', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['destroy', 'snippet', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['browse', 'label', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']],
  ['read', 'label', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']],
  ['edit', 'label', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['add', 'label', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['destroy', 'label', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['add', 'member_custom_field', ['Administrator', 'Admin Integration']],
  ['edit', 'member_custom_field', ['Administrator', 'Admin Integration']],
  ['destroy', 'member_custom_field', ['Administrator', 'Admin Integration']],
  ['read', 'identity', ['Administrator']],
  ['auth', 'members_stripe_connect', ['Administrator']],
  [
    'browse',
    'member',
    ['Administrator', 'Admin Integration', 'DB Backup Integration', 'Super Editor'],
  ],
  ['read', 'member', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['edit', 'member', ['Administrator', 'Admin Integration', 'Super Editor']],
  [
    'add',
    'member',
    ['Administrator', 'Admin Integration', 'Self-Serve Migration Integration', 'Super Editor'],
  ],
  ['destroy', 'member', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['browse', 'offer', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['read', 'offer', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['edit', 'offer', ['Administrator', 'Admin Integration']],
  ['add', 'offer', ['Administrator', 'Admin Integration']],
  ['browse', 'product', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']],
  ['read', 'product', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']],
  ['edit', 'product', ['Administrator', 'Admin Integration']],
  ['add', 'product', ['Administrator', 'Admin Integration']],
  ['destroy', 'product', ['Administrator']],
  ['reset', 'authentication', ['Administrator']],
  ['browse', 'custom_theme_setting', ['Administrator']],
  ['edit', 'custom_theme_setting', ['Administrator']],
  [
    'browse',
    'newsletter',
    ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor'],
  ],
  [
    'read',
    'newsletter',
    ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor'],
  ],
  ['edit', 'newsletter', ['Administrator', 'Admin Integration']],
  ['add', 'newsletter', ['Administrator', 'Admin Integration']],
  ['browse', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['read', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['edit', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['add', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['destroy', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['moderate', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['like', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['unlike', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['report', 'comment', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['browse', 'link', ['Administrator', 'Admin Integration']],
  ['edit', 'link', ['Administrator', 'Admin Integration']],
  ['browse', 'mention', ['Administrator', 'Admin Integration']],
  [
    'browse',
    'collection',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'read',
    'collection',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['edit', 'collection', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  ['add', 'collection', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']],
  ['destroy', 'collection', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']],
  [
    'browse',
    'recommendation',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  [
    'read',
    'recommendation',
    ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor'],
  ],
  ['edit', 'recommendation', ['Administrator', 'Admin Integration']],
  ['add', 'recommendation', ['Administrator', 'Admin Integration']],
  ['destroy', 'recommendation', ['Administrator', 'Admin Integration']],
  ['read', 'member_signin_url', ['Administrator', 'Admin Integration', 'Super Editor']],
  ['browse', 'automated_email', ['Administrator', 'Admin Integration']],
  ['read', 'automated_email', ['Administrator', 'Admin Integration']],
  ['edit', 'automated_email', ['Administrator', 'Admin Integration']],
  ['add', 'automated_email', ['Administrator', 'Admin Integration']],
  ['destroy', 'automated_email', ['Administrator', 'Admin Integration']],
  ['browse', 'automation', ['Administrator', 'Admin Integration']],
  ['read', 'automation', ['Administrator', 'Admin Integration']],
  ['add', 'automation', ['Administrator', 'Admin Integration']],
  ['edit', 'automation', ['Administrator', 'Admin Integration']],
  ['poll', 'automation', ['Scheduler Integration']],
  ['browse', 'email_design_setting', ['Administrator', 'Admin Integration']],
  ['read', 'email_design_setting', ['Administrator', 'Admin Integration']],
  ['edit', 'email_design_setting', ['Administrator', 'Admin Integration']],
  ['add', 'email_design_setting', ['Administrator', 'Admin Integration']],
  ['destroy', 'email_design_setting', ['Administrator', 'Admin Integration']],
];

const holders = (actionType: string, objectType: string) =>
  ROLE_ORDER.filter((role) =>
    rolePermissions
      .forRoles([role])
      .some((perm) => perm.action_type === actionType && perm.object_type === objectType),
  );

describe('Permissions', function () {
  describe('role grants', function () {
    it('defines 149 permissions', function () {
      // If you have to change this number, add the relevant rows to GRANTS.
      assert.equal(rolePermissions.all().length, 149);
    });

    it('lists every permission exactly once in GRANTS', function () {
      const grantKeys = GRANTS.map(([actionType, objectType]) => `${actionType}:${objectType}`);
      const permissionKeys = rolePermissions
        .all()
        .map((perm) => `${perm.action_type}:${perm.object_type}`);

      assert.deepEqual(grantKeys.sort(), permissionKeys.sort());
    });

    it('knows about every role in ROLE_ORDER except Owner', function () {
      assert.deepEqual(
        [...rolePermissions.roleNames()].sort(),
        ROLE_ORDER.filter((role) => role !== 'Owner').sort(),
      );
    });

    for (const [actionType, objectType, roles] of GRANTS) {
      it(`grants ${actionType}:${objectType} to the expected roles`, function () {
        assert(
          rolePermissions
            .all()
            .some((perm) => perm.action_type === actionType && perm.object_type === objectType),
          `${actionType}:${objectType} does not exist`,
        );

        assert.deepEqual(holders(actionType, objectType), roles);
      });
    }
  });
});
