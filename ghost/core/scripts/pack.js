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
 *  2. Copy pnpm-workspace.yaml (carries overrides + catalogs for the install)
 *  3. Pack private workspace packages as component tarballs
 *  4. Create a Ghost-CLI compatible tarball (package/ prefix, no node_modules)
 */

/* eslint-disable ghost/ghost-custom/no-native-error */

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');

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
        '--config.inject-workspace-packages=true',
        '--config.ignore-scripts=true'
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

// Write a trimmed pnpm-workspace.yaml into the deploy dir. We keep:
//   - catalog + catalogs (lockfile records & validates these)
//   - allowBuilds + strictDepBuilds (end-user installs need this to permit
//     native module post-install scripts like sqlite3, sharp, re2)
//   - overrides + packageExtensions (root dependency policy must apply to the
//     standalone install as well as the source workspace)
// We deliberately drop:
//   - packages: relative paths that don't exist in the deployed dir.
//   - minimumReleaseAge, blockExoticSubdeps, catalogMode: source-repo
//     supply-chain policies that aren't meaningful at end-user install.
// Written early (rather than after the pack loop) so workspace component
// `pnpm pack` calls below have catalog context to resolve `catalog:` refs
// in their devDependencies.
const workspaceSrc = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
const workspaceDst = path.join(DEPLOY_DIR, 'pnpm-workspace.yaml');
const rootWorkspace = yaml.load(fs.readFileSync(workspaceSrc, 'utf8'));
const deployWorkspace = {};
for (const key of ['catalog', 'catalogs', 'allowBuilds', 'strictDepBuilds', 'overrides', 'packageExtensions']) {
    if (rootWorkspace[key] !== undefined) {
        deployWorkspace[key] = rootWorkspace[key];
    }
}
// Disable minimumReleaseAge in the published tarball. The source repo gates
// fresh deps from entering the lockfile; the deployed package is itself a
// release artifact, and its component tarballs (@tryghost/i18n,
// @tryghost/parse-email-address) aren't on npm so the age check 404s and
// fails the install.
deployWorkspace.minimumReleaseAge = 0;
fs.writeFileSync(workspaceDst, yaml.dump(deployWorkspace));

console.log('Wrote trimmed pnpm-workspace.yaml (catalogs + overrides + allowBuilds, age check off)');

// Pack workspace packages as component tarballs.
// The versions in this archive are the ones that shipped with this Ghost
// build — they must never be fetched from the registry, so ghost-cli installs
// them from bundled tarballs. pnpm deploy writes absolute file:// refs that
// won't work on another machine. The set is discovered transitively: the
// koenig kg-* packages depend on each other via workspace: specs, so a direct
// dependency of ghost/core can pull in further workspace packages.
const componentsDir = path.join(DEPLOY_DIR, 'components');
fs.mkdirSync(componentsDir, {recursive: true});

// name → source dir for every package in the root workspace
const workspacePackageDirs = new Map();
for (const pattern of rootWorkspace.packages || []) {
    const candidates = pattern.endsWith('/*')
        ? fs.readdirSync(path.join(ROOT_DIR, pattern.slice(0, -2)), {withFileTypes: true})
            .filter(entry => entry.isDirectory())
            .map(entry => path.join(ROOT_DIR, pattern.slice(0, -2), entry.name))
        : [path.join(ROOT_DIR, pattern)];
    for (const dir of candidates) {
        const pkgJsonPath = path.join(dir, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
            workspacePackageDirs.set(fsExtra.readJsonSync(pkgJsonPath).name, dir);
        }
    }
}

const componentQueue = Object.entries(pkg.dependencies || {})
    .filter(([, val]) => typeof val === 'string' && val.includes('file:'))
    .map(([key]) => key);
const directComponents = new Set(componentQueue);
const packedComponents = new Map(); // name → tarball filename

while (componentQueue.length > 0) {
    const name = componentQueue.shift();
    if (packedComponents.has(name)) {
        continue;
    }

    const srcDir = workspacePackageDirs.get(name);
    if (!srcDir) {
        throw new Error(`${name} is referenced as a workspace dependency but is not a workspace package`);
    }

    const depPkg = fsExtra.readJsonSync(path.join(srcDir, 'package.json'));
    const slug = name.replaceAll('@', '').replaceAll('/', '-');
    const tgzName = `${slug}-${depPkg.version}.tgz`;

    console.log(`  Packing ${name} → components/${tgzName}`);
    // Pack from the source workspace so pnpm itself rewrites workspace: specs
    // (packing the deploy-dir copy fails on them — no workspace context there).
    execFileSync(
        'pnpm',
        ['pack', '--pack-destination', componentsDir],
        {cwd: srcDir, stdio: 'pipe'}
    );
    packedComponents.set(name, tgzName);

    for (const [depName, spec] of Object.entries(depPkg.dependencies || {})) {
        if (typeof spec === 'string' && spec.startsWith('workspace:')) {
            componentQueue.push(depName);
        }
    }
}

for (const name of directComponents) {
    pkg.dependencies[name] = `file:components/${packedComponents.get(name)}`;
}

// Force every component to resolve to its bundled tarball wherever it appears
// in the graph. pnpm pack rewrote the components' own workspace: specs to
// registry ranges (e.g. ~2.1.3), which must not be resolved from npm — the
// bundled tarballs are the versions this Ghost build was tested against.
deployWorkspace.overrides = {...deployWorkspace.overrides};
for (const [name, tgzName] of packedComponents) {
    deployWorkspace.overrides[name] = `file:components/${tgzName}`;
}
fs.writeFileSync(workspaceDst, yaml.dump(deployWorkspace));
console.log('Added component tarball overrides to pnpm-workspace.yaml');

// Carry over root-level fields that pnpm deploy doesn't preserve.
const rootPkg = fsExtra.readJsonSync(path.join(ROOT_DIR, 'package.json'));

// packageManager — required by corepack (Dockerfile) and verified by CI release checks.
if (!rootPkg.packageManager) {
    throw new Error('Root package.json is missing required "packageManager" field');
}
pkg.packageManager = rootPkg.packageManager;
console.log(`  Set packageManager: ${rootPkg.packageManager.split('+')[0]}`);

// pnpm overrides live in the published pnpm-workspace.yaml (written above).
// pnpm 11 only reads overrides from workspace.yaml, not from a package's
// `pnpm.overrides`. We deliberately do NOT also write pnpm.overrides here:
// pnpm 11 still hashes that field into its lockfile-overrides-config check,
// even though it logs that it's ignoring it, which produces
// ERR_PNPM_LOCKFILE_CONFIG_MISMATCH under frozen-lockfile (CI=true) installs.

fsExtra.writeJsonSync(pkgPath, pkg, {spaces: 2});

// Regenerate the lockfile inside the deploy dir to match the post-processed
// package.json. We've stripped peer suffixes and rewritten file: refs to
// component tarballs; without this step, the lockfile retains the original
// (unstripped, absolute-path) specifiers and end users hit
// ERR_PNPM_OUTDATED_LOCKFILE under pnpm 11's frozen-lockfile (CI=true)
// install. Previously masked by `frozen-lockfile=false` in the shipped
// .npmrc, which pnpm 11 no longer honors.
console.log('\nRegenerating lockfile against post-processed package.json...');
execFileSync(
    'pnpm',
    ['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts'],
    {cwd: DEPLOY_DIR, stdio: 'inherit'}
);

// 3. Validate deploy output before tarring.
// Guards against regressions in this script that would produce a valid-looking
// but broken tarball (missing lockfile, missing overrides merge, empty components/).
console.log('\nValidating deploy output...');
const packagedPkg = fsExtra.readJsonSync(pkgPath);
const requiredFiles = ['pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package.json'];
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
const packagedWorkspace = yaml.load(fs.readFileSync(workspaceDst, 'utf8'));
if (!packagedWorkspace?.catalog || Object.keys(packagedWorkspace.catalog).length === 0) {
    throw new Error('Packaged pnpm-workspace.yaml is missing the default catalog');
}
if (!packagedWorkspace?.overrides || Object.keys(packagedWorkspace.overrides).length === 0) {
    throw new Error('Packaged pnpm-workspace.yaml is missing root overrides');
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
