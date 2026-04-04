#!/usr/bin/env node
/* eslint-disable no-console, ghost/ghost-custom/no-native-error */

const path = require('path');
const fs = require('fs');
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

/**
 * Validates that a slug is kebab-case (lowercase alphanumeric with single hyphens).
 */
function isValidSlug(slug) {
    return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}

/**
 * Returns the migration version folder name for the given package version.
 *
 * semver.inc(v, 'minor') handles both cases:
 *   - Stable 6.18.0 → 6.19.0 (increments minor)
 *   - Prerelease 6.19.0-rc.0 → 6.19.0 (strips prerelease, keeps minor)
 *
 * Key invariant: 6.18.0 and 6.19.0-rc.0 both produce folder "6.19".
 */
function getNextMigrationVersion(version) {
    const next = semver.inc(version, 'minor');
    if (!next) {
        throw new Error(`Invalid version: ${version}`);
    }
    return `${semver.major(next)}.${semver.minor(next)}`;
}

/**
 * Creates a migration file and optionally bumps package versions to RC.
 *
 * @param {object} options
 * @param {string} options.slug - The migration name in kebab-case
 * @param {string} options.coreDir - Path to ghost/core directory
 * @param {Date}   [options.date] - Override the timestamp (for testing)
 * @returns {{migrationPath: string, rcVersion: string|null}}
 */
function createMigration({slug, coreDir, date}) {
    if (!isValidSlug(slug)) {
        throw new Error(`Invalid slug: "${slug}". Use kebab-case (e.g. add-column-to-posts)`);
    }

    const migrationsDir = path.join(coreDir, 'core', 'server', 'data', 'migrations', 'versions');
    const corePackagePath = path.join(coreDir, 'package.json');

    const corePackage = JSON.parse(fs.readFileSync(corePackagePath, 'utf8'));
    const currentVersion = corePackage.version;

    const nextVersion = getNextMigrationVersion(currentVersion);
    const versionDir = path.join(migrationsDir, nextVersion);

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

    // Auto-bump to RC if this is a stable version
    let rcVersion = null;
    if (!semver.prerelease(currentVersion)) {
        rcVersion = semver.inc(currentVersion, 'preminor', 'rc');

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

// CLI entry point
if (require.main === module) {
    const slug = process.argv[2];

    if (!slug) {
        console.error('Usage: yarn migrate:create <slug>');
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

module.exports = {isValidSlug, getNextMigrationVersion, createMigration};
