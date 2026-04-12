#!/usr/bin/env node

/**
 * pack.js — Build a distributable Ghost tarball using pnpm deploy.
 *
 * Uses pnpm's native deploy command to create a standalone directory with all
 * production dependencies resolved from the workspace, then post-processes
 * the output for ghost-cli compatibility:
 *
 *  1. Strip peer dep suffixes from version strings (pnpm deploy artifact)
 *  2. Pack private workspace packages as component tarballs
 *  3. Create a ghost-cli compatible tarball (package/ prefix, no node_modules)
 */

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const CORE_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(CORE_DIR, '../..');
const DEPLOY_DIR = path.join(CORE_DIR, '.deploy');

// 1. Run pnpm deploy
// inject-workspace-packages is enabled only for deploy (not workspace-wide)
// because it conflicts with packages that have build outputs in their files field.
console.log('Running pnpm deploy...');
execSync(`rm -rf ${DEPLOY_DIR}`, {stdio: 'inherit'});
execSync(`pnpm --filter ghost deploy ${DEPLOY_DIR} --prod --config.inject-workspace-packages=true`, {
    cwd: ROOT_DIR,
    stdio: 'inherit'
});

// 2. Fix package.json
console.log('\nPost-processing package.json...');
const pkgPath = path.join(DEPLOY_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

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
        console.warn(`  Warning: ${key} not found in node_modules, skipping`);
        continue;
    }

    const depPkg = JSON.parse(fs.readFileSync(path.join(depDir, 'package.json'), 'utf8'));
    const slug = key.replace(/@/g, '').replace(/\//g, '-');
    const tgzName = `${slug}-${depPkg.version}.tgz`;

    console.log(`  Packing ${key} → components/${tgzName}`);
    execSync(`npm pack --pack-destination ${componentsDir}`, {cwd: depDir, stdio: 'pipe'});
    pkg.dependencies[key] = `file:components/${tgzName}`;
}

// Merge root-level pnpm overrides into the deployed package.json.
// In the workspace, the root package.json overrides apply globally (e.g., forcing
// moment to 2.24.0 so moment-timezone doesn't pull in a separate copy). pnpm deploy
// creates a standalone context where these root overrides don't apply, so we merge
// the relevant ones into this package's overrides.
const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
if (rootPkg.pnpm?.overrides || rootPkg.overrides) {
    const rootOverrides = rootPkg.pnpm?.overrides || rootPkg.overrides;
    pkg.pnpm = pkg.pnpm || {};
    pkg.pnpm.overrides = {...rootOverrides, ...pkg.pnpm.overrides};
    console.log(`  Merged ${Object.keys(rootOverrides).length} root overrides into package.json`);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

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

// 3. Create tarball
// Rename .deploy → package for ghost-cli compatibility (expects package/ prefix)
const version = pkg.version;
const tgzPath = path.join(CORE_DIR, `ghost-${version}.tgz`);
const packageDir = path.join(CORE_DIR, 'package');

execSync(`rm -rf ${packageDir}`);
fs.renameSync(DEPLOY_DIR, packageDir);


console.log(`\nCreating tarball: ghost-${version}.tgz`);
execSync(
    `tar czf ${tgzPath} --exclude='node_modules' package`,
    {cwd: CORE_DIR, stdio: 'inherit'}
);

// Move back for Docker build context (CI uses .deploy/)
fs.renameSync(packageDir, DEPLOY_DIR);

// Remove node_modules — Docker build installs its own
execSync(`rm -rf ${path.join(DEPLOY_DIR, 'node_modules')}`);

const size = (fs.statSync(tgzPath).size / 1024 / 1024).toFixed(1);
console.log(`\nDone: ${tgzPath} (${size} MB)`);
