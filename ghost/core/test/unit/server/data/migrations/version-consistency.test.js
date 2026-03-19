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

function getLatestVersionFolder(folders) {
    return folders.sort((a, b) => semver.compare(semver.coerce(a), semver.coerce(b))).pop();
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

    it('new migrations should only be added to the latest version folder', function () {
        const folders = getVersionFolders();
        const latestVersion = getLatestVersionFolder(folders);

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

        // Extract version folder from each new migration file path
        const migrationsInOldVersions = newFiles.filter((file) => {
            const match = file.match(/migrations\/versions\/(\d+\.\d+)\//);
            if (!match) {
                return false;
            }
            return match[1] !== latestVersion;
        });

        assert.equal(
            migrationsInOldVersions.length,
            0,
            `New migrations must be added to the latest version folder (${latestVersion}), ` +
            `but found new migrations in previous versions:\n` +
            migrationsInOldVersions.map(f => `  - ${f}`).join('\n') + '\n' +
            `Adding migrations to previous versions can cause them to not run or corrupt the database.`
        );
    });
});
