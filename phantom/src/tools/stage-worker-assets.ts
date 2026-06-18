// Stages every static file the Workers runtime serves into
// dist-worker/assets/, laid out by the FileStore logical key namespace
// (src/platform/files/store.ts). The wrangler assets binding serves this
// directory; src/platform/files/workers.ts reads it by key.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();
const outRoot = path.resolve(cwd, 'dist-worker', 'assets');

const exists = async (target: string) => {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
};

const staged: string[] = [];
const missing: string[] = [];

// The Node FileStore falls back PER FILE across candidate roots; mirror that
// by overlaying every existing root, lowest priority first, so the highest
// priority root wins per file rather than shadowing whole directories.
const stage = async (sources: string[], destination: string) => {
    const existing: string[] = [];
    for (const source of sources) {
        if (await exists(source)) {
            existing.push(source);
        }
    }
    if (existing.length === 0) {
        missing.push(`${destination} (tried: ${sources.map((source) => path.relative(cwd, source)).join(', ')})`);
        return;
    }
    const target = path.join(outRoot, destination);
    await fs.mkdir(path.dirname(target), {recursive: true});
    for (const source of existing.reverse()) {
        await fs.cp(source, target, {recursive: true, force: true});
    }
    staged.push(destination);
};

const listAppDists = async () => {
    const appsRoot = path.resolve(cwd, '..', 'apps');
    try {
        const entries = await fs.readdir(appsRoot, {withFileTypes: true});
        return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .filter((name) => /^[a-z0-9-]+$/.test(name));
    } catch {
        return [];
    }
};

const run = async () => {
    await fs.rm(outRoot, {recursive: true, force: true});
    await fs.mkdir(outRoot, {recursive: true});

    // Ember admin shell + bundled assets (yarn admin:sync output preferred).
    await stage([
        path.resolve(cwd, 'content', 'admin'),
        path.resolve(cwd, '..', 'ghost', 'core', 'core', 'built', 'admin')
    ], 'admin');

    // Embedded React app dists (stats, posts, admin-x-settings, ...).
    for (const appName of await listAppDists()) {
        const dist = path.resolve(cwd, '..', 'apps', appName, 'dist');
        if (await exists(dist)) {
            await stage([dist], path.join('apps', appName));
        }
    }

    // Public frontend assets and UMD bundles.
    await stage([path.resolve(cwd, '..', 'ghost', 'core', 'content', 'public')], 'public');
    await stage([path.resolve(cwd, '..', 'apps', 'portal', 'umd', 'portal.min.js')], path.join('portal', 'portal.min.js'));
    await stage([path.resolve(cwd, '..', 'apps', 'sodo-search', 'umd', 'sodo-search.min.js')], path.join('sodo-search', 'sodo-search.min.js'));
    await stage([path.resolve(cwd, '..', 'apps', 'announcement-bar', 'umd', 'announcement-bar.min.js')], path.join('announcement-bar', 'announcement-bar.min.js'));

    // Member attribution sources (composed into one bundle at serve time).
    await stage([path.resolve(cwd, '..', 'ghost', 'core', 'core', 'frontend', 'src', 'utils', 'url-attribution.js')], path.join('attribution', 'url-attribution.js'));
    await stage([path.resolve(cwd, '..', 'ghost', 'core', 'core', 'frontend', 'src', 'member-attribution', 'member-attribution.js')], path.join('attribution', 'member-attribution.js'));

    // Theme assets for the bundled themes (templates ship in the worker
    // bundle itself via static bundle.mjs imports).
    for (const themeId of ['casper', 'source']) {
        await stage([
            path.resolve(cwd, 'content', 'themes', themeId, 'assets'),
            path.resolve(cwd, '..', 'ghost', 'core', 'content', 'themes', themeId, 'assets'),
            path.resolve(cwd, '..', 'ghost', 'core', 'test', 'utils', 'fixtures', 'themes', themeId, 'assets')
        ], path.join('themes', themeId, 'assets'));
    }

    process.stdout.write(`${JSON.stringify({staged, missing, output: path.relative(cwd, outRoot)}, null, 2)}\n`);
};

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
});
