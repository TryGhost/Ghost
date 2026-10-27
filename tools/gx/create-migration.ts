#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import semver from 'semver';

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

function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}

/**
 * Resolves the most recent stable tag (e.g. v6.34.0) from git.
 * Excludes prerelease tags so the answer reflects what's actually shipped.
 */
function readLastPublishedVersion(cwd: string) {
  const tag = execSync(
    `git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' --exclude 'v*-*'`,
    { cwd, encoding: 'utf8' },
  ).trim();
  return tag.replace(/^v/, '');
}

function minorOf(version: string) {
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
function getTargetMigrationFolder(packageVersion: string, lastPublishedVersion: string) {
  const packageMinor = minorOf(packageVersion);
  const nextVersion = semver.inc(lastPublishedVersion, 'minor');
  if (nextVersion === null) {
    throw new Error(`Invalid published version: ${lastPublishedVersion}`);
  }
  const nextAfterPublished = minorOf(nextVersion);

  return semver.gte(`${packageMinor}.0`, `${nextAfterPublished}.0`)
    ? packageMinor
    : nextAfterPublished;
}

type MigrationOptions = {
  slug: string;
  coreDir: string;
  date?: Date;
  lastPublishedVersion?: string;
};

/**
 * Creates a migration file and promotes package.json to the target minor RC
 * if needed. Promotion is required because knex-migrator filters out folders
 * whose version > package.json's major.minor — without it, the new migration
 * would be silently skipped on dev installs.
 */
function createMigration({ slug, coreDir, date, lastPublishedVersion }: MigrationOptions) {
  if (!isValidSlug(slug)) {
    throw new Error(`Invalid slug: "${slug}". Use kebab-case (e.g. add-column-to-posts)`);
  }

  const migrationsDir = path.join(coreDir, 'core', 'server', 'data', 'migrations', 'versions');
  const corePackagePath = path.join(coreDir, 'package.json');

  const corePackage: unknown = JSON.parse(fs.readFileSync(corePackagePath, 'utf8'));
  if (
    typeof corePackage !== 'object' ||
    corePackage === null ||
    !('version' in corePackage) ||
    typeof corePackage.version !== 'string'
  ) {
    throw new Error(`Invalid package version: ${corePackagePath}`);
  }
  const currentVersion = corePackage.version;

  const resolvedLastPublished = lastPublishedVersion || readLastPublishedVersion(coreDir);
  const targetFolder = getTargetMigrationFolder(currentVersion, resolvedLastPublished);
  const versionDir = path.join(migrationsDir, targetFolder);

  const timestamp = (date || new Date())
    .toISOString()
    .slice(0, 19)
    .replace('T', '-')
    .replaceAll(':', '-');
  const filename = `${timestamp}-${slug}.js`;
  const migrationPath = path.join(versionDir, filename);

  fs.mkdirSync(versionDir, { recursive: true });
  try {
    fs.writeFileSync(migrationPath, MIGRATION_TEMPLATE, { flag: 'wx' });
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
      throw new Error(`Migration already exists: ${migrationPath}`);
    }
    throw err;
  }

  let rcVersion: string | null = null;
  if (minorOf(currentVersion) !== targetFolder) {
    rcVersion = `${targetFolder}.0-rc.0`;

    corePackage.version = rcVersion;
    fs.writeFileSync(corePackagePath, JSON.stringify(corePackage, null, 2) + '\n');

    const adminPackagePath = path.resolve(coreDir, '..', 'admin', 'package.json');
    if (fs.existsSync(adminPackagePath)) {
      const adminPackage: unknown = JSON.parse(fs.readFileSync(adminPackagePath, 'utf8'));
      if (typeof adminPackage !== 'object' || adminPackage === null) {
        throw new Error(`Invalid package: ${adminPackagePath}`);
      }
      Object.assign(adminPackage, { version: rcVersion });
      fs.writeFileSync(adminPackagePath, JSON.stringify(adminPackage, null, 2) + '\n');
    }
  }

  return { migrationPath, rcVersion };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];

  if (!slug) {
    console.error('Usage: pnpm gx generate migration <slug>');
    console.error('  slug: kebab-case migration name (e.g. add-column-to-posts)');
    process.exit(1);
  }

  try {
    const coreDir = fileURLToPath(new URL('../../ghost', import.meta.url));
    const { migrationPath, rcVersion } = createMigration({ slug, coreDir });

    console.log(`Created migration: ${migrationPath}`);
    if (rcVersion) {
      console.log(`Bumped version to ${rcVersion}`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export { isValidSlug, getTargetMigrationFolder, createMigration };
