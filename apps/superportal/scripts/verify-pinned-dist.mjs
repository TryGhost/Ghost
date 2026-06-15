#!/usr/bin/env node
// Asserts the built entry contains no relative module-specifier literals.
// Relative specifiers in portal.min.js resolve against the version-ranged CDN
// URL it is served from, and jsdelivr resolves ranged URLs per-file with
// independent caches — a relative chunk import in the entry 404s after a patch
// publish. Specifiers inside chunks/* are safe: those files only ever load
// from URLs already pinned to an exact version by src/shell/bootstrap.ts.
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

if (process.env.SP_TARGET === 'embed') {
    console.log('verify-pinned-dist: embed target, skipping');
    process.exit(0);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(scriptDir, '../dist/portal');
const entryPath = resolve(distDir, 'portal.min.js');
const violations = [];

for (const required of [entryPath, resolve(distDir, 'chunks/shell.min.js'), resolve(distDir, 'locales/en.json')]) {
    if (!existsSync(required)) {
        violations.push(`missing build output: ${required}`);
    }
}

if (existsSync(entryPath)) {
    const entry = readFileSync(entryPath, 'utf8');

    const specifierPatterns = [
        {name: 'static import', regex: /\bfrom\s*["']/},
        {name: 'bare static import', regex: /(^|[^\w$.])import\s*["']/},
        {name: 'dynamic import literal', regex: /import\(\s*["']/}
    ];
    for (const {name, regex} of specifierPatterns) {
        if (regex.test(entry)) {
            violations.push(`entry contains a ${name} specifier literal — it would resolve against the ranged CDN URL`);
        }
    }

    for (const required of ['chunks/shell.min.js', '__superportalAssetUrl']) {
        if (!entry.includes(required)) {
            violations.push(`entry is missing "${required}" — bootstrap indirection did not survive the build`);
        }
    }
}

if (violations.length > 0) {
    for (const violation of violations) {
        console.error(`verify-pinned-dist: ${violation}`);
    }
    process.exit(1);
}

console.log('verify-pinned-dist: ok');
