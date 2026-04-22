const assert = require('assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {isValidSlug, getNextMigrationVersion, createMigration} = require('../../../bin/create-migration');

describe('bin/create-migration', function () {
    describe('isValidSlug', function () {
        it('accepts valid kebab-case slugs', function () {
            assert.ok(isValidSlug('add-column'));
            assert.ok(isValidSlug('fix-index'));
            assert.ok(isValidSlug('a'));
            assert.ok(isValidSlug('add-mentions-table'));
            assert.ok(isValidSlug('a1'));
            assert.ok(isValidSlug('123'));
        });

        it('rejects invalid slugs', function () {
            assert.ok(!isValidSlug(undefined));
            assert.ok(!isValidSlug(''));
            assert.ok(!isValidSlug('has spaces'));
            assert.ok(!isValidSlug('UPPER'));
            assert.ok(!isValidSlug('camelCase'));
            assert.ok(!isValidSlug('has_underscores'));
            assert.ok(!isValidSlug('-leading'));
            assert.ok(!isValidSlug('trailing-'));
            assert.ok(!isValidSlug('double--hyphen'));
            assert.ok(!isValidSlug('special!chars'));
            assert.ok(!isValidSlug('path/slash'));
        });
    });

    describe('getNextMigrationVersion', function () {
        it('increments minor for stable versions', function () {
            assert.equal(getNextMigrationVersion('6.18.0'), '6.19');
            assert.equal(getNextMigrationVersion('5.75.0'), '5.76');
            assert.equal(getNextMigrationVersion('6.0.0'), '6.1');
            assert.equal(getNextMigrationVersion('7.12.3'), '7.13');
        });

        it('uses current minor for prerelease versions', function () {
            assert.equal(getNextMigrationVersion('6.19.0-rc.0'), '6.19');
            assert.equal(getNextMigrationVersion('6.19.0-rc.1'), '6.19');
            assert.equal(getNextMigrationVersion('6.0.0-alpha.0'), '6.0');
            assert.equal(getNextMigrationVersion('5.75.0-beta.1'), '5.75');
        });

        it('stable and its RC target the same folder', function () {
            assert.equal(getNextMigrationVersion('6.18.0'), '6.19');
            assert.equal(getNextMigrationVersion('6.19.0-rc.0'), '6.19');
        });

        it('throws for invalid versions', function () {
            assert.throws(() => getNextMigrationVersion('not-a-version'), /Invalid version/);
        });
    });

    describe('createMigration', function () {
        let tmpDir;
        let coreDir;

        beforeEach(function () {
            // Create a parent dir that mirrors the monorepo layout (core/ + admin/)
            // so path.resolve(coreDir, '..', 'admin') stays inside the sandbox
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-migration-test-'));
            coreDir = path.join(tmpDir, 'core');

            fs.mkdirSync(path.join(coreDir, 'core', 'server', 'data', 'migrations', 'versions'), {recursive: true});
        });

        afterEach(function () {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        });

        function writePackageJson(dir, version) {
            fs.writeFileSync(
                path.join(dir, 'package.json'),
                JSON.stringify({name: 'ghost', version}, null, 2) + '\n'
            );
        }

        function readVersion(dir) {
            return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
        }

        it('creates a migration file in the correct version folder', function () {
            writePackageJson(coreDir, '6.18.0');

            const result = createMigration({
                slug: 'add-column',
                coreDir,
                date: new Date('2026-02-23T10:30:00Z')
            });

            assert.ok(fs.existsSync(result.migrationPath));
            assert.ok(result.migrationPath.includes(path.join('versions', '6.19')));
            assert.ok(result.migrationPath.endsWith('2026-02-23-10-30-00-add-column.js'));
        });

        it('writes the migration template', function () {
            writePackageJson(coreDir, '6.18.0');

            const {migrationPath} = createMigration({
                slug: 'test-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z')
            });

            const content = fs.readFileSync(migrationPath, 'utf8');
            assert.ok(content.includes('require(\'@tryghost/logging\')'));
            assert.ok(content.includes('createNonTransactionalMigration'));
            assert.ok(content.includes('createTransactionalMigration'));
            assert.ok(content.includes('module.exports = /**/;'));
        });

        it('creates the version directory if it does not exist', function () {
            writePackageJson(coreDir, '6.18.0');

            const versionDir = path.join(coreDir, 'core', 'server', 'data', 'migrations', 'versions', '6.19');
            assert.ok(!fs.existsSync(versionDir));

            createMigration({
                slug: 'new-folder',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z')
            });

            assert.ok(fs.existsSync(versionDir));
        });

        it('bumps to RC when current version is stable', function () {
            writePackageJson(coreDir, '6.18.0');

            const {rcVersion} = createMigration({
                slug: 'first-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z')
            });

            assert.equal(rcVersion, '6.19.0-rc.0');
            assert.equal(readVersion(coreDir), '6.19.0-rc.0');
        });

        it('bumps admin package.json when it exists', function () {
            writePackageJson(coreDir, '6.18.0');

            const adminDir = path.join(tmpDir, 'admin');
            fs.mkdirSync(adminDir, {recursive: true});
            writePackageJson(adminDir, '6.18.0');

            createMigration({
                slug: 'with-admin',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z')
            });

            assert.equal(readVersion(adminDir), '6.19.0-rc.0');
        });

        it('does not bump when already a prerelease', function () {
            writePackageJson(coreDir, '6.19.0-rc.0');

            const {rcVersion} = createMigration({
                slug: 'second-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z')
            });

            assert.equal(rcVersion, null);
            assert.equal(readVersion(coreDir), '6.19.0-rc.0');
        });

        it('places RC migrations in the same folder as stable', function () {
            writePackageJson(coreDir, '6.19.0-rc.0');

            const result = createMigration({
                slug: 'rc-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z')
            });

            assert.ok(result.migrationPath.includes(path.join('versions', '6.19')));
        });

        it('throws for invalid slug', function () {
            writePackageJson(coreDir, '6.18.0');

            assert.throws(
                () => createMigration({slug: 'INVALID', coreDir}),
                /Invalid slug/
            );
        });

        it('throws for missing slug', function () {
            writePackageJson(coreDir, '6.18.0');

            assert.throws(
                () => createMigration({slug: undefined, coreDir}),
                /Invalid slug/
            );
        });
    });
});
