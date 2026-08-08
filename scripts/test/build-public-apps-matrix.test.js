import {describe, it} from 'node:test';
import assert from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildMatrix, cdnPathsFor, defaultsAtRevision} from '../build-public-apps-matrix.js';
import {PUBLIC_APPS} from '../lib/public-apps.js';

const DEFAULTS = JSON.parse(await readFile(
    resolve(import.meta.dirname, '../../ghost/core/core/shared/config/defaults.json'),
    'utf8'
));

const allPackageNames = PUBLIC_APPS.map(app => app.packageName);

describe('buildMatrix', () => {
    it('returns an empty matrix when nothing is affected', () => {
        assert.deepStrictEqual(buildMatrix([]), []);
    });

    it('ignores affected projects that are not public apps', () => {
        assert.deepStrictEqual(buildMatrix(['ghost', '@tryghost/admin']), []);
    });

    it('filters to just the affected apps', () => {
        const matrix = buildMatrix(['@tryghost/portal', 'ghost']);
        assert.strictEqual(matrix.length, 1);
        assert.strictEqual(matrix[0].package_name, '@tryghost/portal');
        assert.strictEqual(matrix[0].package_path, 'apps/portal');
    });

    it('includes an app when only its defaults.json version line changed', () => {
        const previousDefaults = structuredClone(DEFAULTS);
        previousDefaults.portal.version = '2.68';

        const matrix = buildMatrix(['ghost', 'ghost-monorepo'], previousDefaults);

        assert.strictEqual(matrix.length, 1);
        assert.strictEqual(matrix[0].package_name, '@tryghost/portal');
    });

    it('ignores unrelated changes to an app defaults.json entry', () => {
        const previousDefaults = structuredClone(DEFAULTS);
        previousDefaults.portal.url = 'https://example.com/old-portal.js';

        assert.deepStrictEqual(buildMatrix(['ghost', 'ghost-monorepo'], previousDefaults), []);
    });

    it('preserves public-apps.json order regardless of affected order', () => {
        const matrix = buildMatrix([...allPackageNames].reverse());
        assert.deepStrictEqual(matrix.map(e => e.package_name), allPackageNames);
    });

    it('flattens cdn_paths to a newline-delimited string for the purge step', () => {
        const [portal] = buildMatrix(['@tryghost/portal']);
        assert.strictEqual(
            portal.cdn_paths,
            'https://cdn.jsdelivr.net/ghost/portal@~CURRENT_MINOR/umd/portal.min.js'
        );
    });

    it('includes every asset for a multi-asset app, not just the bundle', () => {
        // sodo-search ships a stylesheet alongside its JS. This is the case the
        // old hand-maintained cdnPaths list had to remember and derivation gets
        // for free.
        const [sodoSearch] = buildMatrix(['@tryghost/sodo-search']);
        assert.deepStrictEqual(sodoSearch.cdn_paths.split('\n'), [
            'https://cdn.jsdelivr.net/ghost/sodo-search@~CURRENT_MINOR/umd/sodo-search.min.js',
            'https://cdn.jsdelivr.net/ghost/sodo-search@~CURRENT_MINOR/umd/main.css'
        ]);
    });
});

describe('defaultsAtRevision', () => {
    it('reads defaults.json at a revision', async () => {
        const defaults = await defaultsAtRevision('HEAD');

        assert.strictEqual(defaults.sodoSearch.version, DEFAULTS.sodoSearch.version);
    });

    // This runs in job_setup, which every other job depends on, so an
    // unreadable base must degrade to "no version line moved" rather than
    // failing the entire CI run.
    it('returns null for a revision it cannot read', async () => {
        assert.strictEqual(await defaultsAtRevision('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'), null);
    });

    it('selects on the affected set alone when there is no base to compare', () => {
        assert.deepStrictEqual(buildMatrix([], DEFAULTS), []);
        assert.deepStrictEqual(
            buildMatrix(['@tryghost/portal'], DEFAULTS).map(entry => entry.package_name),
            ['@tryghost/portal']
        );
    });
});

describe('cdnPathsFor', () => {
    it('substitutes the defaults.json version placeholder', () => {
        assert.deepStrictEqual(
            cdnPathsFor({url: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/x.min.js', version: '1.2'}),
            ['https://cdn.jsdelivr.net/ghost/x@~CURRENT_MINOR/umd/x.min.js']
        );
    });

    it('picks up every URL field, so a newly added asset is purged automatically', () => {
        const paths = cdnPathsFor({
            url: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/x.min.js',
            styles: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/main.css',
            somethingNew: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/extra.js',
            version: '1.2'
        });
        assert.strictEqual(paths.length, 3);
        assert.ok(paths.every(p => p.includes('CURRENT_MINOR')));
    });

    it('never treats the version field itself as a URL', () => {
        assert.deepStrictEqual(cdnPathsFor({version: '1.2'}), []);
    });
});

describe('public-apps.json <-> defaults.json contract', () => {
    it('every listed app resolves to a defaults.json entry', () => {
        for (const app of PUBLIC_APPS) {
            assert.ok(
                DEFAULTS[app.configKey],
                `${app.packageName} has configKey "${app.configKey}" with no defaults.json entry`
            );
        }
    });

    it('every listed app yields at least one URL to purge', () => {
        for (const app of PUBLIC_APPS) {
            assert.ok(
                cdnPathsFor(DEFAULTS[app.configKey]).length > 0,
                `${app.packageName} would publish with an empty purge list`
            );
        }
    });

    it('purges exactly the URLs core serves, with only the version differing', () => {
        for (const entry of buildMatrix(allPackageNames)) {
            const app = PUBLIC_APPS.find(a => a.packageName === entry.package_name);
            const served = Object.values(DEFAULTS[app.configKey])
                .filter(v => typeof v === 'string' && v.startsWith('https://'))
                .map(v => v.replaceAll('{version}', 'CURRENT_MINOR'));
            assert.deepStrictEqual(entry.cdn_paths.split('\n'), served, entry.package_name);
        }
    });
});
