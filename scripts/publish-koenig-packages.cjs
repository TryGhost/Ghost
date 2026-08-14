#!/usr/bin/env node

/**
 * publish-koenig-packages.js — publish changed koenig/* packages to npm.
 *
 * Runs in the release (tag) lane after publish_ghost succeeds, so every
 * published package version corresponds to content that shipped inside a
 * released Ghost. Ghost itself never installs these from npm — dev and CI
 * resolve them from the workspace, and the production archive embeds them as
 * component tarballs (see ghost/core/scripts/pack.js). npm publishing exists
 * for external consumers only.
 *
 * For each koenig/* package:
 *   1. Skip if its directory is unchanged between the previous release tag
 *      and the current one (first release after the monorepo merge has no
 *      koenig/ in the previous tag, so everything publishes once).
 *   2. Compute the next version: package.json pins the major.minor line,
 *      npm is the source of truth for the patch (compute-next-app-version).
 *   3. Write the version, build via Nx, and publish. Packages are processed
 *      in dependency order so workspace:~ rewrites pick up the versions
 *      published in the same run.
 *
 * Usage: node publish-koenig-packages.js <currentTag> [--dry-run]
 *        node publish-koenig-packages.js --package <name> [--dry-run]
 *
 * The --package form is the escape hatch for urgent out-of-band publishes
 * (publish-koenig-package.yml workflow_dispatch): it publishes the named
 * package from the current checkout unconditionally, no change detection.
 */

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const {computeNextVersion, getPublishedVersions} = require('./compute-next-app-version.cjs');

const ROOT_DIR = path.resolve(__dirname, '..');
const KOENIG_DIR = path.join(ROOT_DIR, 'koenig');

function run(cmd, args, opts = {}) {
    return execFileSync(cmd, args, {cwd: ROOT_DIR, encoding: 'utf8', ...opts});
}

function loadPackages() {
    return fs.readdirSync(KOENIG_DIR)
        .filter(dir => fs.existsSync(path.join(KOENIG_DIR, dir, 'package.json')))
        .map((dir) => {
            const pkg = JSON.parse(fs.readFileSync(path.join(KOENIG_DIR, dir, 'package.json'), 'utf8'));
            return {dir, name: pkg.name, private: !!pkg.private, pkg};
        })
        .filter(entry => !entry.private);
}

// Order packages so dependencies publish before dependents. workspace:~ specs
// are rewritten from the dependency's package.json version at publish time,
// so a dependency bumped earlier in the run is reflected in its dependents.
function toposort(packages) {
    const byName = new Map(packages.map(p => [p.name, p]));
    const sorted = [];
    const visiting = new Set();
    const visited = new Set();

    function visit(entry) {
        if (visited.has(entry.name)) {
            return;
        }
        if (visiting.has(entry.name)) {
            throw new Error(`Dependency cycle involving ${entry.name}`);
        }
        visiting.add(entry.name);
        const deps = {...entry.pkg.dependencies, ...entry.pkg.devDependencies};
        for (const depName of Object.keys(deps)) {
            if (byName.has(depName)) {
                visit(byName.get(depName));
            }
        }
        visiting.delete(entry.name);
        visited.add(entry.name);
        sorted.push(entry);
    }

    packages.forEach(visit);
    return sorted;
}

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const packageFlagIndex = args.indexOf('--package');
    const onlyPackage = packageFlagIndex === -1 ? null : args[packageFlagIndex + 1];
    const currentTag = args.find((arg, i) => !arg.startsWith('--') && (packageFlagIndex === -1 || i !== packageFlagIndex + 1));

    if (!currentTag && !onlyPackage) {
        throw new Error('Usage: publish-koenig-packages.js <currentTag> [--dry-run] | --package <name> [--dry-run]');
    }

    let previousTag = null;
    if (currentTag) {
        try {
            previousTag = run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*', `${currentTag}^`]).trim();
        } catch (error) {
            console.log('No previous release tag found — treating all packages as changed');
        }
    }

    let packages = toposort(loadPackages());
    if (onlyPackage) {
        packages = packages.filter(entry => entry.name === onlyPackage);
        if (packages.length === 0) {
            throw new Error(`Unknown koenig package: ${onlyPackage}`);
        }
    }
    const published = [];
    const skipped = [];

    for (const entry of packages) {
        const pkgDir = path.join(KOENIG_DIR, entry.dir);

        if (previousTag) {
            const diff = run('git', ['diff', '--name-only', previousTag, currentTag, '--', `koenig/${entry.dir}`]).trim();
            if (!diff) {
                skipped.push(entry.name);
                continue;
            }
        }

        const nextVersion = computeNextVersion(entry.pkg.version, getPublishedVersions(entry.name));
        console.log(`\nPublishing ${entry.name}@${nextVersion}${dryRun ? ' (dry run)' : ''}`);

        // Write the version before building so anything baked into the build
        // output matches what we publish. Not committed back — npm is the
        // source of truth for the patch digit.
        run('npm', ['pkg', 'set', `version=${nextVersion}`], {cwd: pkgDir});

        // kg-simplemde ships prebuilt sources and has no build target
        if (entry.pkg.scripts && entry.pkg.scripts.build) {
            run('pnpm', ['nx', 'build', entry.name], {stdio: 'inherit'});
        }

        const publishArgs = ['publish', '--access', 'public', '--no-git-checks'];
        if (dryRun) {
            publishArgs.push('--dry-run');
        }
        run('pnpm', publishArgs, {cwd: pkgDir, stdio: 'inherit'});

        published.push(`${entry.name}@${nextVersion}`);
    }

    console.log(`\nPublished (${published.length}): ${published.join(', ') || 'none'}`);
    console.log(`Unchanged since ${previousTag || 'n/a'} (${skipped.length}): ${skipped.join(', ') || 'none'}`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
