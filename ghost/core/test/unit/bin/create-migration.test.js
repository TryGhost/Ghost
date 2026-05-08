const assert = require('assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {isValidSlug, getTargetMigrationFolder, createMigration} = require('../../../bin/create-migration');

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

    describe('getTargetMigrationFolder', function () {
        it('targets the minor after the last published version when package is on the patch RC', function () {
            assert.equal(getTargetMigrationFolder('6.34.1-rc.0', '6.34.0'), '6.35');
            assert.equal(getTargetMigrationFolder('6.34.2-rc.0', '6.34.0'), '6.35');
        });

        it('stays on the current minor when package is already promoted to the next minor RC', function () {
            assert.equal(getTargetMigrationFolder('6.35.0-rc.0', '6.34.0'), '6.35');
            assert.equal(getTargetMigrationFolder('6.35.0-rc.3', '6.34.0'), '6.35');
        });

        it('targets the next minor when package is sitting on a stable version', function () {
            assert.equal(getTargetMigrationFolder('6.34.0', '6.34.0'), '6.35');
            assert.equal(getTargetMigrationFolder('5.75.0', '5.75.0'), '5.76');
        });

        it('does not double-bump when package is further ahead than next-of-published', function () {
            // Hypothetical recovery state — package was manually promoted ahead
            assert.equal(getTargetMigrationFolder('6.36.0-rc.0', '6.34.0'), '6.36');
        });
    });

    describe('createMigration', function () {
        let tmpDir;
        let coreDir;

        beforeEach(function () {
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

        it('creates a migration file in the next-minor folder when on a patch RC', function () {
            writePackageJson(coreDir, '6.34.1-rc.0');

            const result = createMigration({
                slug: 'add-column',
                coreDir,
                date: new Date('2026-02-23T10:30:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            assert.ok(fs.existsSync(result.migrationPath));
            assert.ok(result.migrationPath.includes(path.join('versions', '6.35')));
            assert.ok(result.migrationPath.endsWith('2026-02-23-10-30-00-add-column.js'));
        });

        it('writes the migration template', function () {
            writePackageJson(coreDir, '6.34.1-rc.0');

            const {migrationPath} = createMigration({
                slug: 'test-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            const content = fs.readFileSync(migrationPath, 'utf8');
            assert.ok(content.includes('require(\'@tryghost/logging\')'));
            assert.ok(content.includes('createNonTransactionalMigration'));
            assert.ok(content.includes('createTransactionalMigration'));
            assert.ok(content.includes('module.exports = /**/;'));
        });

        it('creates the version directory if it does not exist', function () {
            writePackageJson(coreDir, '6.34.1-rc.0');

            const versionDir = path.join(coreDir, 'core', 'server', 'data', 'migrations', 'versions', '6.35');
            assert.ok(!fs.existsSync(versionDir));

            createMigration({
                slug: 'new-folder',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            assert.ok(fs.existsSync(versionDir));
        });

        it('promotes package.json from patch RC to next-minor RC on first migration of the cycle', function () {
            writePackageJson(coreDir, '6.34.1-rc.0');

            const {rcVersion} = createMigration({
                slug: 'first-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            assert.equal(rcVersion, '6.35.0-rc.0');
            assert.equal(readVersion(coreDir), '6.35.0-rc.0');
        });

        it('promotes from a stable version when no RC exists yet', function () {
            writePackageJson(coreDir, '6.34.0');

            const {rcVersion} = createMigration({
                slug: 'first-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            assert.equal(rcVersion, '6.35.0-rc.0');
            assert.equal(readVersion(coreDir), '6.35.0-rc.0');
        });

        it('promotes admin package.json alongside core', function () {
            writePackageJson(coreDir, '6.34.1-rc.0');

            const adminDir = path.join(tmpDir, 'admin');
            fs.mkdirSync(adminDir, {recursive: true});
            writePackageJson(adminDir, '6.34.1-rc.0');

            createMigration({
                slug: 'with-admin',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            assert.equal(readVersion(adminDir), '6.35.0-rc.0');
        });

        it('does not bump when already on the target minor RC', function () {
            writePackageJson(coreDir, '6.35.0-rc.0');

            const {rcVersion} = createMigration({
                slug: 'second-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            assert.equal(rcVersion, null);
            assert.equal(readVersion(coreDir), '6.35.0-rc.0');
        });

        it('places subsequent migrations in the same folder as the first', function () {
            writePackageJson(coreDir, '6.35.0-rc.0');

            const result = createMigration({
                slug: 'rc-migration',
                coreDir,
                date: new Date('2026-01-01T00:00:00Z'),
                lastPublishedVersion: '6.34.0'
            });

            assert.ok(result.migrationPath.includes(path.join('versions', '6.35')));
        });

        it('throws for invalid slug', function () {
            writePackageJson(coreDir, '6.34.1-rc.0');

            assert.throws(
                () => createMigration({slug: 'INVALID', coreDir, lastPublishedVersion: '6.34.0'}),
                /Invalid slug/
            );
        });

        it('throws for missing slug', function () {
            writePackageJson(coreDir, '6.34.1-rc.0');

            assert.throws(
                () => createMigration({slug: undefined, coreDir, lastPublishedVersion: '6.34.0'}),
                /Invalid slug/
            );
        });
    });
});
