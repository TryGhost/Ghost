const assert = require('node:assert/strict');
const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

const migrationsDir = path.join(
    __dirname, '../../../../../core/server/data/migrations/versions'
);

function getVersionFolders() {
    return fs.readdirSync(migrationsDir)
        .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
        .filter(f => /^\d+\.\d+$/.test(f));
}

describe('Migration version consistency', function () {
    it('all migration folders should be runnable at current package.json version', function () {
        const pkg = require('../../../../../package.json');
        const safeVersion = pkg.version.match(/^(\d+\.)?(\d+)/)[0];

        const folders = getVersionFolders();

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

    it('new migrations should only target the next minor version', function () {
        const pkg = require('../../../../../package.json');
        const currentVersion = pkg.version.match(/^(\d+\.)?(\d+)/)[0];

        // Get newly added migration files compared to origin/main
        let newFiles;
        try {
            const diff = execSync(
                'git diff origin/main --name-only --diff-filter=A -- ghost/core/core/server/data/migrations/versions/',
                {cwd: path.join(__dirname, '../../../../../../..'), encoding: 'utf8'}
            );
            newFiles = diff.trim().split('\n').filter(Boolean);
        } catch (err) {
            // If origin/main is not available (e.g. shallow clone), skip
            this.skip();
            return;
        }

        if (newFiles.length === 0) {
            return;
        }

        // New migrations must be in a version folder greater than the current package.json version
        const migrationsInOldVersions = newFiles.filter((file) => {
            const match = file.match(/migrations\/versions\/(\d+\.\d+)\//);
            if (!match) {
                return false;
            }
            const folderVersion = match[1];
            return !semver.gt(semver.coerce(folderVersion), semver.coerce(currentVersion));
        });

        assert.equal(
            migrationsInOldVersions.length,
            0,
            `New migrations must target the next minor version (greater than ${currentVersion}), ` +
            `but found new migrations in current or previous versions:\n` +
            migrationsInOldVersions.map(f => `  - ${f}`).join('\n') + '\n' +
            `Adding migrations to current or previous versions can cause them to not run or corrupt the database.`
        );
    });
});
