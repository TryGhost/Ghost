const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

describe('Migration version consistency', function () {
    it('all migration folders should be runnable at current package.json version', function () {
        const pkg = require('../../../../../package.json');
        const safeVersion = pkg.version.match(/^(\d+\.)?(\d+)/)[0];

        const migrationsDir = path.join(
            __dirname, '../../../../../core/server/data/migrations/versions'
        );

        const folders = fs.readdirSync(migrationsDir)
            .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
            .filter(f => /^\d+\.\d+$/.test(f));

        const orphaned = folders.filter((folder) => {
            // Same comparison knex-migrator uses: folder > currentVersion
            return semver.gt(semver.coerce(folder), semver.coerce(safeVersion));
        });

        assert.equal(
            orphaned.length,
            0,
            `Migration folders exceed package.json version (${pkg.version}, safe: ${safeVersion}): ` +
            `${orphaned.join(', ')}\n` +
            `Run \`slimer migration\` which handles the version bump automatically, ` +
            `or manually bump package.json to the next minor rc.`
        );
    });
});
