import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';

// Permissions are defined in services/permissions/permissions-data.ts and
// nothing reads the permissions tables, so a migration that writes to them
// does nothing. Older migrations keep using these helpers on upgrade.
const LAST_VERSION_WITH_PERMISSION_MIGRATIONS = '6.72';

const PERMISSION_MIGRATION_PATTERN =
  /\b(addPermission|addPermissionToRole|addPermissionWithRoles|removePermissionFromRole|createRemovePermissionMigration)\b|\bpermissions_(roles|users)\b|['"`]permissions['"`.]/;

describe('Permission migrations', function () {
  it('are not added after permissions moved into code', function () {
    const migrationsDir = path.join(
      __dirname,
      '../../../../../core/server/data/migrations/versions',
    );

    const newerFolders = fs
      .readdirSync(migrationsDir)
      .filter((f) => /^\d+\.\d+$/.test(f))
      .filter((f) =>
        semver.gt(semver.coerce(f)!, semver.coerce(LAST_VERSION_WITH_PERMISSION_MIGRATIONS)!),
      );

    const offenders = newerFolders.flatMap((folder) =>
      fs
        .readdirSync(path.join(migrationsDir, folder))
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))
        .filter((file) =>
          PERMISSION_MIGRATION_PATTERN.test(
            fs.readFileSync(path.join(migrationsDir, folder, file), 'utf8'),
          ),
        )
        .map((file) => `${folder}/${file}`),
    );

    assert.deepEqual(
      offenders,
      [],
      'Permissions are defined in ghost/core/server/services/permissions/permissions-data.ts. ' +
        'Add or change them there instead of in a migration.',
    );
  });
});
