#!/usr/bin/env node
'use strict';

/**
 * fetch-themes.js — Materialize the bundled default themes into content/themes.
 *
 * Replaces the old git-submodule mechanism: themes.json pins each theme to a
 * released version + commit SHA, and this script downloads the matching GitHub
 * tarball (cached in ~/.cache/ghost-themes) and extracts it. Idempotent, no
 * dependencies, and safe to run in parallel with `pnpm install`.
 *
 * A theme directory that is a real git clone (.git directory) is a developer
 * checkout and is always left untouched — delete it and re-run to get the
 * pinned version back. A .git *file* is a leftover submodule working tree
 * from before this mechanism and is cleaned up and replaced.
 *
 * Usage: node ghost/core/scripts/fetch-themes.js [--force]
 */

/* eslint-disable ghost/ghost-custom/no-native-error */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const {execFileSync} = require('node:child_process');

const CORE_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(CORE_DIR, 'themes.json');
const THEMES_DIR = path.join(CORE_DIR, 'content/themes');
const CACHE_DIR = process.env.GHOST_THEMES_CACHE_DIR || path.join(os.homedir(), '.cache', 'ghost-themes');
const FORCE = process.argv.includes('--force');

function log(message) {
    console.log(`[fetch-themes] ${message}`);
}

function installedVersion(themeDir) {
    try {
        return JSON.parse(fs.readFileSync(path.join(themeDir, 'package.json'), 'utf8')).version;
    } catch (err) {
        return null;
    }
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`GET ${url} responded with ${response.statusCode}`));
                return;
            }
            const tmp = `${dest}.tmp-${process.pid}`;
            const file = fs.createWriteStream(tmp);
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    fs.renameSync(tmp, dest);
                    resolve();
                });
            });
            file.on('error', reject);
        });
        request.on('error', reject);
    });
}

async function fetchTheme(name, {repo, version, sha}) {
    const themeDir = path.join(THEMES_DIR, name);
    const dotGit = path.join(themeDir, '.git');

    if (fs.existsSync(dotGit)) {
        if (fs.statSync(dotGit).isDirectory()) {
            log(`${name}: developer git checkout detected, leaving untouched`);
            return;
        }
        log(`${name}: cleaning up old submodule working tree`);
        fs.rmSync(themeDir, {recursive: true, force: true});
    }

    if (!FORCE && installedVersion(themeDir) === version) {
        log(`${name}: v${version} already present`);
        return;
    }

    fs.mkdirSync(CACHE_DIR, {recursive: true});
    const tarball = path.join(CACHE_DIR, `${name}-${sha}.tar.gz`);
    if (fs.existsSync(tarball)) {
        log(`${name}: using cached tarball for v${version}`);
    } else {
        log(`${name}: downloading v${version} from ${repo}@${sha.slice(0, 10)}`);
        await download(`https://codeload.github.com/${repo}/tar.gz/${sha}`, tarball);
    }

    // Extract next to the destination so the final rename never crosses
    // filesystems and a crash can't leave a half-written theme dir behind.
    fs.mkdirSync(THEMES_DIR, {recursive: true});
    const extractDir = fs.mkdtempSync(path.join(THEMES_DIR, `.${name}-`));
    try {
        execFileSync('tar', ['-xzf', tarball, '-C', extractDir, '--strip-components', '1']);
        const extractedVersion = installedVersion(extractDir);
        if (extractedVersion !== version) {
            throw new Error(`${name}: extracted version ${extractedVersion} does not match pinned v${version}`);
        }
        fs.rmSync(themeDir, {recursive: true, force: true});
        fs.renameSync(extractDir, themeDir);
    } catch (err) {
        fs.rmSync(extractDir, {recursive: true, force: true});
        fs.rmSync(tarball, {force: true});
        throw err;
    }
    log(`${name}: v${version} installed`);
}

async function main() {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const results = await Promise.allSettled(
        Object.entries(manifest).map(([name, pin]) => fetchTheme(name, pin))
    );
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) {
        for (const failure of failures) {
            console.error(`[fetch-themes] ${failure.reason.message}`);
        }
        console.error('[fetch-themes] Failed to fetch bundled themes — check your network and re-run `pnpm run setup`');
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(`[fetch-themes] ${err.message}`);
    process.exit(1);
});
