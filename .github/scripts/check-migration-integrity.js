const fs = require('fs');
const path = require('path');
const execFileSync = require('child_process').execFileSync;

const MIGRATIONS_PATH = 'ghost/core/core/server/data/migrations/versions';
const PACKAGE_JSON_PATH = 'ghost/core/package.json';

function runGit(args) {
    try {
        return execFileSync('git', args, {encoding: 'utf8'}).trim();
    } catch (error) {
        const stderr = error.stderr ? error.stderr.toString().trim() : '';
        const stdout = error.stdout ? error.stdout.toString().trim() : '';
        const message = stderr || stdout || error.message;
        throw new Error(`Failed to run "git ${args.join(' ')}": ${message}`);
    }
}

/**
 * Parse a version folder name like "6.28" into {major, minor} numbers.
 */
function parseVersionFolder(folder) {
    const match = folder.match(/^(\d+)\.(\d+)$/);
    if (!match) {
        return null;
    }
    return {major: Number(match[1]), minor: Number(match[2])};
}

/**
 * Extract the safe version (major.minor) from the package.json version string.
 * e.g. "6.28.0-rc.0" → {major: 6, minor: 28}
 */
function getSafeVersion() {
    const packageJsonPath = path.resolve(__dirname, '../../', PACKAGE_JSON_PATH);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const match = pkg.version.match(/^(\d+)\.(\d+)/);
    if (!match) {
        throw new Error(`Unable to parse version from ${PACKAGE_JSON_PATH}: ${pkg.version}`);
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        raw: pkg.version,
        safe: match[0]
    };
}

/**
 * Compare two {major, minor} version objects.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
function compareVersions(a, b) {
    if (a.major !== b.major) {
        return a.major > b.major ? 1 : -1;
    }
    if (a.minor !== b.minor) {
        return a.minor > b.minor ? 1 : -1;
    }
    return 0;
}

/**
 * Check 1: No migration version folders should exceed the package.json version.
 * This catches orphaned folders that knex-migrator would skip.
 */
function checkOrphanedFolders(safeVersion) {
    const migrationsDir = path.resolve(__dirname, '../../', MIGRATIONS_PATH);
    const folders = fs.readdirSync(migrationsDir)
        .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
        .filter(f => /^\d+\.\d+$/.test(f));

    const orphaned = folders.filter((folder) => {
        const folderVersion = parseVersionFolder(folder);
        return folderVersion && compareVersions(folderVersion, safeVersion) > 0;
    });

    if (orphaned.length > 0) {
        return `Migration folders exceed package.json version (${safeVersion.raw}, safe: ${safeVersion.safe}): ${orphaned.join(', ')}\n` +
            'Run `yarn migrate:create` which handles the version bump automatically, ' +
            'or manually bump package.json to the next minor rc.';
    }
    return null;
}

/**
 * Check 2: New migration files in this PR should not be in version folders
 * older than the current package.json safe version.
 * This catches migrations that would be silently skipped by knex-migrator
 * for users who have already migrated past that version.
 */
function checkStalePlacements(safeVersion, baseSha, compareSha) {
    let mergeBaseSha;
    try {
        mergeBaseSha = runGit(['merge-base', baseSha, compareSha]);
    } catch (error) {
        throw new Error(
            `Unable to determine merge-base for ${baseSha} and ${compareSha}. ` +
            `Ensure the base branch history is available in the checkout.\n${error.message}`
        );
    }

    const newFiles = runGit([
        'diff', '--name-only', '--diff-filter=A',
        mergeBaseSha, compareSha,
        '--', MIGRATIONS_PATH
    ]);

    if (!newFiles) {
        return null;
    }

    const stale = [];

    for (const file of newFiles.split('\n').filter(Boolean)) {
        // Extract the version folder from the path
        // e.g. ghost/core/core/server/data/migrations/versions/6.27/some-migration.js → 6.27
        const relativePath = file.replace(MIGRATIONS_PATH + '/', '');
        const folderName = relativePath.split('/')[0];
        const folderVersion = parseVersionFolder(folderName);

        if (!folderVersion) {
            continue;
        }

        if (compareVersions(folderVersion, safeVersion) < 0) {
            stale.push({file, folder: folderName});
        }
    }

    if (stale.length > 0) {
        const fileList = stale.map(s => `  ${s.file} (in ${s.folder}/)`).join('\n');
        return `New migration(s) added to already-released version folders:\n${fileList}\n\n` +
            `The current package version is ${safeVersion.raw} (safe: ${safeVersion.safe}), ` +
            `so new migrations should be in the ${safeVersion.safe}/ folder.\n` +
            'Migrations in older folders will not run for users who have already migrated past that version.\n' +
            `Use \`yarn migrate:create\` to create new migrations in the correct folder.`;
    }

    return null;
}

function main() {
    const safeVersion = getSafeVersion();
    const errors = [];

    // Check 1: Orphaned folders (no git context needed)
    const orphanedError = checkOrphanedFolders(safeVersion);
    if (orphanedError) {
        errors.push(orphanedError);
    }

    // Check 2: Stale placements (needs git context, only on PRs)
    const baseSha = process.env.PR_BASE_SHA;
    const compareSha = process.env.PR_COMPARE_SHA || process.env.GITHUB_SHA;

    if (baseSha && compareSha) {
        const staleError = checkStalePlacements(safeVersion, baseSha, compareSha);
        if (staleError) {
            errors.push(staleError);
        }
    } else {
        console.log('No PR context (PR_BASE_SHA not set). Skipping stale placement check.');
    }

    if (errors.length > 0) {
        throw new Error(`Migration integrity check failed:\n\n${errors.join('\n\n')}`);
    }

    console.log(`Migration integrity checks passed (package version: ${safeVersion.raw}, safe: ${safeVersion.safe}).`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
