const fs = require('fs');
const path = require('path');
const execFileSync = require('child_process').execFileSync;

const MIGRATIONS_PATH = 'ghost/core/core/server/data/migrations/versions';
const PACKAGE_JSON_PATH = 'ghost/core/package.json';

/**
 * Run a git command with the given arguments and return its trimmed stdout.
 * Throws an Error including stderr/stdout on failure so callers can surface a
 * useful message instead of an opaque exec error.
 */
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
 * Resolve the last published stable version from git tags (matching the logic
 * used by ghost/core/bin/create-migration.js). Returns null if no stable tag is
 * found (e.g. a shallow checkout without tags).
 */
function getLastPublishedMinor() {
    try {
        const tag = runGit([
            'describe', '--tags', '--abbrev=0',
            '--match', 'v[0-9]*.[0-9]*.[0-9]*',
            '--exclude', 'v*-*'
        ]);
        const match = tag.match(/^v(\d+)\.(\d+)/);
        if (!match) {
            return null;
        }
        return {
            major: Number(match[1]),
            minor: Number(match[2]),
            tag
        };
    } catch (error) {
        console.log(`Unable to resolve last published tag: ${error.message}`);
        return null;
    }
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
            'Run `pnpm migrate:create <slug>` from ghost/core (ghost/core/bin/create-migration.js handles the version bump automatically), ' +
            'or manually bump package.json to the next minor rc.';
    }
    return null;
}

/**
 * Check 2: New migration files in this PR must be placed in a folder that is
 * strictly greater than the last published stable version's minor.
 *
 * knex-migrator filters migrations by the installed Ghost version's
 * major.minor — so a migration added to a folder that's already been published
 * (e.g. dropping a 6.35/ migration into a PR after v6.35.0 has shipped) will
 * be silently skipped for any user who has already migrated past 6.35.
 *
 * This mirrors ghost/core/bin/create-migration.js, which always targets at
 * least lastPublishedMinor + 1 when picking the folder for a new migration.
 *
 * Falls back to the package.json safe version as a floor if the last published
 * tag can't be resolved (e.g. a checkout without tags), which is the looser
 * pre-patch-RC check.
 */
function checkStalePlacements(safeVersion, lastPublishedMinor, baseSha, compareSha) {
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

        // A migration is stale if it's in a folder at or below lastPublishedMinor
        // (i.e. already shipped). When lastPublishedMinor is unavailable, fall
        // back to safeVersion - any folder strictly below safe is still wrong.
        const isStale = lastPublishedMinor
            ? compareVersions(folderVersion, lastPublishedMinor) <= 0
            : compareVersions(folderVersion, safeVersion) < 0;

        if (isStale) {
            stale.push({file, folder: folderName});
        }
    }

    if (stale.length > 0) {
        const fileList = stale.map(s => `  ${s.file} (in ${s.folder}/)`).join('\n');
        const versionContext = lastPublishedMinor
            ? `Last published version is ${lastPublishedMinor.tag}, so new migrations must be in a folder above ${lastPublishedMinor.major}.${lastPublishedMinor.minor}/.`
            : `The current package version is ${safeVersion.raw} (safe: ${safeVersion.safe}), so new migrations should be in the ${safeVersion.safe}/ folder.`;
        return `New migration(s) added to already-released version folders:\n${fileList}\n\n` +
            `${versionContext}\n` +
            'Migrations in older folders will not run for users who have already migrated past that version.\n' +
            'Run `pnpm migrate:create <slug>` from ghost/core to create new migrations in the correct folder.';
    }

    return null;
}

/**
 * Entry point. Runs the orphaned-folder check unconditionally and the
 * stale-placement check when PR_BASE_SHA / PR_COMPARE_SHA env vars are
 * present. Aggregates failures into a single thrown error so the CI job
 * reports every problem at once.
 */
function main() {
    const safeVersion = getSafeVersion();
    const lastPublishedMinor = getLastPublishedMinor();
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
        const staleError = checkStalePlacements(safeVersion, lastPublishedMinor, baseSha, compareSha);
        if (staleError) {
            errors.push(staleError);
        }
    } else {
        console.log('No PR context (PR_BASE_SHA not set). Skipping stale placement check.');
    }

    if (errors.length > 0) {
        throw new Error(`Migration integrity check failed:\n\n${errors.join('\n\n')}`);
    }

    const lastPublishedSummary = lastPublishedMinor ? `, last published: ${lastPublishedMinor.tag}` : '';
    console.log(`Migration integrity checks passed (package version: ${safeVersion.raw}, safe: ${safeVersion.safe}${lastPublishedSummary}).`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
