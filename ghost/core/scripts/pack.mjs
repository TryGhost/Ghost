#!/usr/bin/env node

/**
 * pack.mjs — Build the Ghost-CLI release archive.
 *
 * Produces ghost/core/ghost-<version>.tgz, the archive consumed by
 * `ghost install --archive` and `ghost update --archive` (Ghost-CLI). It is not
 * published to npm; it is the release artifact uploaded to GitHub.
 *
 * Built with `pnpm pack` (see the root .pnpmfile.mjs `beforePacking` hook):
 *
 *  1. Pack Ghost's production-only workspace dependency closure into
 *     components/*.tgz — the versions this build shipped with, never fetched
 *     from the registry.
 *  2. Pack `ghost` itself; the beforePacking hook rewrites its workspace deps to
 *     `file:components/*.tgz`, strips devDependencies/nx/scripts. Extract it into
 *     package/.
 *  3. Write a trimmed pnpm-workspace.yaml (catalogs + overrides, component
 *     tarball overrides, release-age check off).
 *  4. Seed the root lockfile, then regenerate it against the packed manifest so
 *     dependency versions match exactly what this build was tested against.
 *  5. Tar package/ into the Ghost-CLI archive (package/ prefix, no node_modules).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import yaml from 'js-yaml';

const execFileAsync = promisify(execFile);

const CORE_DIR = path.resolve(import.meta.dirname, '..');
const ROOT_DIR = path.resolve(CORE_DIR, '../..');
const BUILD_DIR = path.join(CORE_DIR, 'package');
const COMPONENTS_DIR = path.join(BUILD_DIR, 'components');

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJson = (file, data) => fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
const readYaml = async file => yaml.load(await fs.readFile(file, 'utf8'));
const exists = file => fs.access(file).then(() => true, () => false);

// Run pnpm with the silent reporter (progress/warnings are noise for a build
// script; failures still throw with stderr attached). maxBuffer is bumped since
// captured output can exceed execFile's 1 MB default.
const pnpm = (args, opts = {}) => execFileAsync(
    'pnpm',
    ['--reporter=silent', ...args],
    {cwd: ROOT_DIR, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts}
);

/**
 * Parse `pnpm pack --json` output, which may be a JSON array or a stream of
 * newline-delimited JSON objects depending on the pnpm version.
 *
 * @param {string} output
 * @returns {Array<{name?: string, version?: string, filename?: string, path?: string}>}
 */
function parsePackJson(output) {
    const trimmed = output.trim();
    if (!trimmed) {
        return [];
    }
    try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        return trimmed
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => JSON.parse(line));
    }
}

// Read the root manifest + workspace config up front (independent of the build).
// packageManager is required by corepack and verified by CI release checks.
const [rootPkg, rootWorkspace] = await Promise.all([
    readJson(path.join(ROOT_DIR, 'package.json')),
    readYaml(path.join(ROOT_DIR, 'pnpm-workspace.yaml'))
]);
if (!rootPkg.packageManager) {
    throw new Error('Root package.json is missing required "packageManager" field');
}

// 0. Clean slate
await fs.rm(BUILD_DIR, {recursive: true, force: true});
await fs.mkdir(COMPONENTS_DIR, {recursive: true});

// 1. Pack the production workspace dependency closure as component tarballs.
// `--filter-prod "ghost^..."` selects exactly the prod (not dev) workspace deps
// of ghost, transitively — the kg-* editor packages (which depend on each other),
// @tryghost/i18n, parse-email-address, and the adapter-base-* packages. These
// are the versions this Ghost build was tested against; ghost-cli must install
// them from these bundled tarballs, never from the registry.
console.log('Packing workspace components (pnpm pack, prod closure)...');
const {stdout: packJson} = await pnpm([
    '--filter-prod', 'ghost^...',
    'pack',
    '--pack-destination', COMPONENTS_DIR,
    '--json'
]);

// `pnpm pack --json` emits one JSON object per packed package.
const components = new Map(); // package name → tarball filename
for (const obj of parsePackJson(packJson)) {
    const name = obj.name;
    const file = path.basename(obj.filename || obj.path || '');
    if (!name || !file) {
        continue;
    }
    components.set(name, file);
    console.log(`  ${name} → components/${file}`);
}
if (components.size === 0) {
    throw new Error('pnpm pack produced no component tarballs');
}
await Promise.all([...components].map(async ([name, file]) => {
    if (!await exists(path.join(COMPONENTS_DIR, file))) {
        throw new Error(`Component tarball missing after pack: ${file} (for ${name})`);
    }
}));

// 2. Pack `ghost` itself. The root .pnpmfile.mjs beforePacking hook reads
// GHOST_COMPONENTS to rewrite ghost's workspace deps to file:components/*.tgz,
// and strips devDependencies/nx/scripts from the packed manifest. Extract the
// resulting tarball into package/ (npm layout: a top-level package/ dir).
console.log('\nPacking ghost (pnpm pack)...');
const ghostPackDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-pack-'));
await pnpm(
    ['--filter', 'ghost', 'pack', '--pack-destination', ghostPackDir],
    {env: {...process.env, GHOST_COMPONENTS: JSON.stringify(Object.fromEntries(components))}}
);
const ghostTgz = (await fs.readdir(ghostPackDir)).find(f => f.endsWith('.tgz'));
if (!ghostTgz) {
    throw new Error('pnpm pack did not produce a ghost tarball');
}
// Extract into CORE_DIR; the tarball's top-level package/ dir becomes BUILD_DIR,
// merging alongside the components/ dir packed in step 1.
await execFileAsync('tar', ['xzf', path.join(ghostPackDir, ghostTgz), '-C', CORE_DIR]);
await fs.rm(ghostPackDir, {recursive: true, force: true});

// Carry the root packageManager over — ghost/core's own manifest doesn't declare one.
const pkgPath = path.join(BUILD_DIR, 'package.json');
const pkg = await readJson(pkgPath);
pkg.packageManager = rootPkg.packageManager;
await writeJson(pkgPath, pkg);
console.log(`  Set packageManager: ${rootPkg.packageManager.split('+')[0]}`);

// 3. Write a trimmed pnpm-workspace.yaml. We keep:
//   - catalog + catalogs (lockfile records & validates these)
//   - allowBuilds + strictDepBuilds (end-user installs need this to permit
//     native module post-install scripts like better-sqlite3, sharp, re2)
//   - overrides + packageExtensions (root dependency policy must apply to the
//     standalone install too)
// We drop:
//   - packages: relative paths that don't exist in the standalone dir
//   - minimumReleaseAge, blockExoticSubdeps, catalogMode: source-repo
//     supply-chain policies not meaningful at end-user install (the bundled
//     @tryghost/* component tarballs aren't on npm, so an age check would 404)
console.log('\nWriting pnpm-workspace.yaml...');
const buildWorkspace = {};
for (const key of ['catalog', 'catalogs', 'allowBuilds', 'strictDepBuilds', 'overrides', 'packageExtensions']) {
    if (rootWorkspace[key] !== undefined) {
        buildWorkspace[key] = rootWorkspace[key];
    }
}
buildWorkspace.minimumReleaseAge = 0;

// Force every component to resolve to its bundled tarball wherever it appears in
// the graph. pnpm pack rewrote the components' own workspace: specs to registry
// ranges (e.g. kg-html-to-lexical's ~2.1.3 on kg-default-nodes); those must not
// resolve from npm — the bundled tarballs are the tested versions.
buildWorkspace.overrides = {...buildWorkspace.overrides};
for (const [name, file] of components) {
    buildWorkspace.overrides[name] = `file:components/${file}`;
}
await fs.writeFile(path.join(BUILD_DIR, 'pnpm-workspace.yaml'), yaml.dump(buildWorkspace));

// 4. Generate the lockfile. Seed with the root lockfile first so regeneration
// keeps the exact dependency versions this build was tested against — pnpm
// reuses the existing package snapshot instead of re-resolving ranges to newer
// releases — then regenerate against the packed manifest (workspace deps are now
// file:components/*, devDependencies dropped).
console.log('\nGenerating lockfile (seeded from root)...');
await fs.copyFile(path.join(ROOT_DIR, 'pnpm-lock.yaml'), path.join(BUILD_DIR, 'pnpm-lock.yaml'));
await pnpm(
    ['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts'],
    {cwd: BUILD_DIR}
);

// 5. Validate before tarring — guard against a valid-looking but broken archive.
console.log('\nValidating build output...');
const requiredFiles = ['pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package.json'];
const [packagedPkg, packagedWorkspace, missingFiles, componentTgzCount] = await Promise.all([
    readJson(pkgPath),
    readYaml(path.join(BUILD_DIR, 'pnpm-workspace.yaml')),
    Promise.all(requiredFiles.map(async rel => (await exists(path.join(BUILD_DIR, rel)) ? null : rel))),
    fs.readdir(COMPONENTS_DIR).then(files => files.filter(f => f.endsWith('.tgz')).length)
]);
const missing = missingFiles.filter(Boolean);
if (missing.length > 0) {
    throw new Error(`Required file(s) missing from build output: ${missing.join(', ')}`);
}
if (componentTgzCount !== components.size) {
    throw new Error('components/ tarball count does not match packed component set');
}
if (packagedPkg.devDependencies) {
    throw new Error('Packaged package.json still contains devDependencies');
}
if (packagedPkg.nx) {
    throw new Error('Packaged package.json still contains nx config');
}
if (!packagedPkg.packageManager) {
    throw new Error('Packaged package.json is missing packageManager');
}
for (const [name, spec] of Object.entries(packagedPkg.dependencies || {})) {
    if (typeof spec === 'string' && spec.startsWith('workspace:')) {
        throw new Error(`Packaged package.json still has an unresolved workspace dep: ${name}`);
    }
}
if (!packagedWorkspace?.catalog || Object.keys(packagedWorkspace.catalog).length === 0) {
    throw new Error('Packaged pnpm-workspace.yaml is missing the default catalog');
}
if (!packagedWorkspace?.overrides || Object.keys(packagedWorkspace.overrides).length === 0) {
    throw new Error('Packaged pnpm-workspace.yaml is missing overrides');
}

// 6. Create the tarball (npm layout: top-level package/ dir, no node_modules).
const version = pkg.version;
const tgzPath = path.join(CORE_DIR, `ghost-${version}.tgz`);
await fs.rm(path.join(BUILD_DIR, 'node_modules'), {recursive: true, force: true});

console.log(`\nCreating tarball: ghost-${version}.tgz`);
await execFileAsync('tar', ['czf', tgzPath, 'package'], {cwd: CORE_DIR});

const {size} = await fs.stat(tgzPath);
console.log(`\nDone: ${tgzPath} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
