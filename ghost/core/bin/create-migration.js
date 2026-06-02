#!/usr/bin/env node
/* eslint-disable no-console, ghost/ghost-custom/no-native-error */

const path = require('path');
const fs = require('fs');
const {execSync} = require('child_process');
const semver = require('semver');

const MIGRATION_TEMPLATE = `const logging = require('@tryghost/logging');

// For DDL - schema changes
// const {createNonTransactionalMigration} = require('../../utils');

// For DML - data changes
// const {createTransactionalMigration} = require('../../utils');

// Or use a specific helper
// const {addTable, createAddColumnMigration} = require('../../utils');

module.exports = /**/;
`;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isValidSlug(slug) {
    return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}

/**
 * Resolves the most recent stable tag (e.g. v6.34.0) from git.
 * Excludes prerelease tags so the answer reflects what's actually shipped.
 */
function readLastPublishedVersion(cwd) {
    const tag = execSync(
        `git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' --exclude 'v*-*'`,
        {cwd, encoding: 'utf8'}
    ).trim();
    return tag.replace(/^v/, '');
}

function minorOf(version) {
    return `${semver.major(version)}.${semver.minor(version)}`;
}

/**
 * Returns the migration version folder for a new migration.
 *
 * The folder is always the minor *after* the last published version. If the
 * package version is already promoted to that minor (or beyond — second
 * migration of a cycle), we stay there; otherwise the folder is the next
 * minor and the package version needs to be promoted to match.
 *
 * Examples (last published = 6.34.0):
 *   package 6.34.1-rc.0 → folder 6.35   (needs promote)
 *   package 6.35.0-rc.0 → folder 6.35   (already promoted)
 *   package 6.34.0      → folder 6.35   (needs promote, e.g. fresh checkout)
 */
function getTargetMigrationFolder(packageVersion, lastPublishedVersion) {
    const packageMinor = minorOf(packageVersion);
    const nextAfterPublished = minorOf(semver.inc(lastPublishedVersion, 'minor'));

    return semver.gte(`${packageMinor}.0`, `${nextAfterPublished}.0`)
        ? packageMinor
        : nextAfterPublished;
}

/**
 * Creates a migration file and promotes package.json to the target minor RC
 * if needed. Promotion is required because knex-migrator filters out folders
 * whose version > package.json's major.minor — without it, the new migration
 * would be silently skipped on dev installs.
 *
 * @param {object} options
 * @param {string} options.slug - The migration name in kebab-case
 * @param {string} options.coreDir - Path to ghost/core directory
 * @param {Date}   [options.date] - Override the timestamp (for testing)
 * @param {string} [options.lastPublishedVersion] - Override the last published version (for testing)
 * @returns {{migrationPath: string, rcVersion: string|null}}
 */
function createMigration({slug, coreDir, date, lastPublishedVersion}) {
    if (!isValidSlug(slug)) {
        throw new Error(`Invalid slug: "${slug}". Use kebab-case (e.g. add-column-to-posts)`);
    }

    const migrationsDir = path.join(coreDir, 'core', 'server', 'data', 'migrations', 'versions');
    const corePackagePath = path.join(coreDir, 'package.json');

    const corePackage = JSON.parse(fs.readFileSync(corePackagePath, 'utf8'));
    const currentVersion = corePackage.version;

    const resolvedLastPublished = lastPublishedVersion || readLastPublishedVersion(coreDir);
    const targetFolder = getTargetMigrationFolder(currentVersion, resolvedLastPublished);
    const versionDir = path.join(migrationsDir, targetFolder);

    const timestamp = (date || new Date()).toISOString().slice(0, 19).replace('T', '-').replaceAll(':', '-');
    const filename = `${timestamp}-${slug}.js`;
    const migrationPath = path.join(versionDir, filename);

    fs.mkdirSync(versionDir, {recursive: true});
    try {
        fs.writeFileSync(migrationPath, MIGRATION_TEMPLATE, {flag: 'wx'});
    } catch (err) {
        if (err.code === 'EEXIST') {
            throw new Error(`Migration already exists: ${migrationPath}`);
        }
        throw err;
    }

    let rcVersion = null;
    if (minorOf(currentVersion) !== targetFolder) {
        rcVersion = `${targetFolder}.0-rc.0`;

        corePackage.version = rcVersion;
        fs.writeFileSync(corePackagePath, JSON.stringify(corePackage, null, 2) + '\n');

        const adminPackagePath = path.resolve(coreDir, '..', 'admin', 'package.json');
        if (fs.existsSync(adminPackagePath)) {
            const adminPackage = JSON.parse(fs.readFileSync(adminPackagePath, 'utf8'));
            adminPackage.version = rcVersion;
            fs.writeFileSync(adminPackagePath, JSON.stringify(adminPackage, null, 2) + '\n');
        }
    }

    return {migrationPath, rcVersion};
}

if (require.main === module) {
    const slug = process.argv[2];

    if (!slug) {
        console.error('Usage: pnpm migrate:create <slug>');
        console.error('  slug: kebab-case migration name (e.g. add-column-to-posts)');
        process.exit(1);
    }

    try {
        const coreDir = path.resolve(__dirname, '..');
        const {migrationPath, rcVersion} = createMigration({slug, coreDir});

        console.log(`Created migration: ${migrationPath}`);
        if (rcVersion) {
            console.log(`Bumped version to ${rcVersion}`);
        }
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

module.exports = {isValidSlug, getTargetMigrationFolder, createMigration};
