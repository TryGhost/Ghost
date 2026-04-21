#!/usr/bin/env node

/**
 * pack.js — Build a distributable Ghost tarball for Ghost-CLI.
 *
 * Produces ghost/core/ghost-<version>.tgz, the archive consumed by
 * `ghost install --archive` and `ghost update --archive` (Ghost-CLI). It is
 * not published to npm; it is the release artifact uploaded to GitHub.
 *
 * Uses pnpm's native deploy command to create a standalone directory with all
 * production dependencies resolved from the workspace, then post-processes
 * the output for Ghost-CLI compatibility:
 *
 *  1. Strip peer dep suffixes from version strings (pnpm deploy artifact)
 *  2. Pack private workspace packages as component tarballs
 *  3. Merge root pnpm overrides so standalone installs resolve correctly
 *  4. Create a Ghost-CLI compatible tarball (package/ prefix, no node_modules)
 */

/* eslint-disable no-console, ghost/ghost-custom/no-native-error */

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const fsExtra = require('fs-extra');

const CORE_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(CORE_DIR, '../..');
const DEPLOY_DIR = path.join(CORE_DIR, 'package');

// 1. Run pnpm deploy
// inject-workspace-packages is enabled only for deploy (not workspace-wide)
// because it conflicts with packages that have build outputs in their files field.
console.log('Running pnpm deploy...');
fs.rmSync(DEPLOY_DIR, {recursive: true, force: true});
execFileSync(
    'pnpm',
    [
        '--filter', 'ghost',
        'deploy', DEPLOY_DIR,
        '--prod',
        '--config.inject-workspace-packages=true'
    ],
    {cwd: ROOT_DIR, stdio: 'inherit'}
);

// 2. Fix package.json
console.log('\nPost-processing package.json...');
const pkgPath = path.join(DEPLOY_DIR, 'package.json');
const pkg = fsExtra.readJsonSync(pkgPath);

// Strip peer dep suffixes (e.g., "2.0.17(@noble/hashes@1.8.0)" → "2.0.17")
// pnpm deploy writes lockfile-internal version identifiers into package.json.
// See: https://github.com/pnpm/pnpm/issues/6269
for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (!pkg[section]) {
        continue;
    }
    for (const [key, val] of Object.entries(pkg[section])) {
        if (typeof val === 'string' && val.includes('(')) {
            pkg[section][key] = val.replace(/\(.*$/, '');
        }
    }
}

// Pack private workspace packages as component tarballs.
// These are not on npm, so ghost-cli can't install them from the registry.
// pnpm deploy writes absolute file:// refs that won't work on another machine.
const componentsDir = path.join(DEPLOY_DIR, 'components');
fs.mkdirSync(componentsDir, {recursive: true});

for (const [key, val] of Object.entries(pkg.dependencies || {})) {
    if (typeof val !== 'string' || !val.includes('file:')) {
        continue;
    }

    const depDir = path.join(DEPLOY_DIR, 'node_modules', key);
    if (!fs.existsSync(depDir)) {
        throw new Error(`${key} has a file: dependency ref but is missing from node_modules (${depDir})`);
    }

    const depPkg = fsExtra.readJsonSync(path.join(depDir, 'package.json'));
    const slug = key.replaceAll('@', '').replaceAll('/', '-');
    const tgzName = `${slug}-${depPkg.version}.tgz`;

    console.log(`  Packing ${key} → components/${tgzName}`);
    execFileSync(
        'npm',
        ['pack', '--pack-destination', componentsDir],
        {cwd: depDir, stdio: 'pipe'}
    );
    pkg.dependencies[key] = `file:components/${tgzName}`;
}

// Carry over root-level fields that pnpm deploy doesn't preserve.
const rootPkg = fsExtra.readJsonSync(path.join(ROOT_DIR, 'package.json'));

// packageManager — required by corepack (Dockerfile) and verified by CI release checks.
if (!rootPkg.packageManager) {
    throw new Error('Root package.json is missing required "packageManager" field');
}
pkg.packageManager = rootPkg.packageManager;
console.log(`  Set packageManager: ${rootPkg.packageManager.split('+')[0]}`);

// pnpm overrides — the root overrides apply globally in the workspace (e.g., forcing
// moment to 2.24.0 so moment-timezone doesn't pull in a separate copy). pnpm deploy
// creates a standalone context where these don't apply, so we merge them in.
if (rootPkg.pnpm?.overrides || rootPkg.overrides) {
    const rootOverrides = rootPkg.pnpm?.overrides || rootPkg.overrides;
    pkg.pnpm = pkg.pnpm || {};
    pkg.pnpm.overrides = {...rootOverrides, ...pkg.pnpm.overrides};
    console.log(`  Merged ${Object.keys(rootOverrides).length} root overrides into package.json`);
}

fsExtra.writeJsonSync(pkgPath, pkg, {spaces: 2});

// Copy .npmrc and pnpm-workspace.yaml for ghost-cli installs.
// The lockfile references catalogs from pnpm-workspace.yaml, and pnpm validates
// this even without --frozen-lockfile when CI=true. frozen-lockfile=false prevents
// the config mismatch error in CI environments.
const npmrcSrc = path.join(ROOT_DIR, '.npmrc');
const npmrcDst = path.join(DEPLOY_DIR, '.npmrc');
let npmrc = fs.readFileSync(npmrcSrc, 'utf8');
npmrc += '\nfrozen-lockfile=false\n';
fs.writeFileSync(npmrcDst, npmrc);

const workspaceSrc = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
const workspaceDst = path.join(DEPLOY_DIR, 'pnpm-workspace.yaml');
fs.copyFileSync(workspaceSrc, workspaceDst);

console.log('Copied .npmrc (with frozen-lockfile=false) and pnpm-workspace.yaml');

// 3. Validate deploy output before tarring.
// Guards against regressions in this script that would produce a valid-looking
// but broken tarball (missing lockfile, missing overrides merge, empty components/).
console.log('\nValidating deploy output...');
const packagedPkg = fsExtra.readJsonSync(pkgPath);
const requiredFiles = ['.npmrc', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package.json'];
for (const rel of requiredFiles) {
    if (!fs.existsSync(path.join(DEPLOY_DIR, rel))) {
        throw new Error(`Required file missing from deploy output: ${rel}`);
    }
}
const componentTgzs = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tgz'));
if (componentTgzs.length === 0) {
    throw new Error('No component tarballs produced in components/');
}
if (!packagedPkg.packageManager) {
    throw new Error('Packaged package.json is missing packageManager');
}
if (!packagedPkg.pnpm?.overrides || Object.keys(packagedPkg.pnpm.overrides).length === 0) {
    throw new Error('Packaged package.json is missing pnpm.overrides');
}

// 4. Create tarball
// Uses the standard npm tarball layout (a top-level `package/` directory), which
// is what `npm pack <anything>` produces and what Ghost-CLI expects since it
// installs the archive via pnpm/npm.
const version = pkg.version;
const tgzPath = path.join(CORE_DIR, `ghost-${version}.tgz`);

// Remove node_modules — both the tarball and Docker build install their own
fs.rmSync(path.join(DEPLOY_DIR, 'node_modules'), {recursive: true, force: true});

console.log(`\nCreating tarball: ghost-${version}.tgz`);
execFileSync(
    'tar',
    ['czf', tgzPath, 'package'],
    {cwd: CORE_DIR, stdio: 'inherit'}
);

const size = (fs.statSync(tgzPath).size / 1024 / 1024).toFixed(1);
console.log(`\nDone: ${tgzPath} (${size} MiB)`);
