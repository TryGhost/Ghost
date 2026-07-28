import {describe, it} from 'node:test';
import assert from 'node:assert';
import {
    getWorkspace,
    getPublishablePackages,
    loadPackage,
    resolvePackageCatalog,
} from '../lib/pnpm.js';

// A minimal workspace manifest with both a default catalog and a named catalog,
// mirroring the shape of pnpm-workspace.yaml that resolvePackageCatalog reads.
const workspace = {
    catalog: {
        lodash: '^4.17.21',
        semver: '7.6.0',
    },
    catalogs: {
        react17: {
            react: '17.0.2',
            'react-dom': '17.0.2',
        },
        'tailwind-3.4': {
            tailwindcss: '3.4.1',
        },
    },
};

describe('resolvePackageCatalog', () => {
    it('resolves default catalog references', () => {
        const resolved = resolvePackageCatalog(workspace, {
            dependencies: {lodash: 'catalog:'},
        });

        assert.deepStrictEqual(resolved.dependencies, {lodash: '^4.17.21'});
    });

    it('resolves named catalog references', () => {
        const resolved = resolvePackageCatalog(workspace, {
            dependencies: {react: 'catalog:react17'},
        });

        assert.deepStrictEqual(resolved.dependencies, {react: '17.0.2'});
    });

    it('resolves named catalogs containing hyphens and dots', () => {
        const resolved = resolvePackageCatalog(workspace, {
            dependencies: {tailwindcss: 'catalog:tailwind-3.4'},
        });

        assert.deepStrictEqual(resolved.dependencies, {tailwindcss: '3.4.1'});
    });

    it('leaves non-catalog versions untouched', () => {
        const deps = {
            lodash: '^4.0.0',
            '@tryghost/thing': 'workspace:*',
            other: 'npm:aliased@1.2.3',
        };
        const resolved = resolvePackageCatalog(workspace, {dependencies: {...deps}});

        assert.deepStrictEqual(resolved.dependencies, deps);
    });

    it('resolves catalog refs mixed with plain versions in one section', () => {
        const resolved = resolvePackageCatalog(workspace, {
            dependencies: {
                lodash: 'catalog:',
                react: 'catalog:react17',
                express: '^4.18.0',
            },
        });

        assert.deepStrictEqual(resolved.dependencies, {
            lodash: '^4.17.21',
            react: '17.0.2',
            express: '^4.18.0',
        });
    });

    it('resolves across every dependency section', () => {
        const resolved = resolvePackageCatalog(workspace, {
            dependencies: {lodash: 'catalog:'},
            devDependencies: {semver: 'catalog:'},
            peerDependencies: {react: 'catalog:react17'},
            optionalDependencies: {'react-dom': 'catalog:react17'},
        });

        assert.deepStrictEqual(resolved.dependencies, {lodash: '^4.17.21'});
        assert.deepStrictEqual(resolved.devDependencies, {semver: '7.6.0'});
        assert.deepStrictEqual(resolved.peerDependencies, {react: '17.0.2'});
        assert.deepStrictEqual(resolved.optionalDependencies, {'react-dom': '17.0.2'});
    });

    it('ignores sections that are not present', () => {
        const resolved = resolvePackageCatalog(workspace, {
            name: 'pkg',
            dependencies: {lodash: 'catalog:'},
        });

        assert.strictEqual(resolved.devDependencies, undefined);
        assert.strictEqual(resolved.peerDependencies, undefined);
        assert.strictEqual(resolved.optionalDependencies, undefined);
    });

    it('preserves unrelated top-level manifest fields', () => {
        const resolved = resolvePackageCatalog(workspace, {
            name: '@tryghost/thing',
            version: '1.2.3',
            scripts: {build: 'tsc'},
            dependencies: {lodash: 'catalog:'},
        });

        assert.strictEqual(resolved.name, '@tryghost/thing');
        assert.strictEqual(resolved.version, '1.2.3');
        assert.deepStrictEqual(resolved.scripts, {build: 'tsc'});
    });

    it('does not mutate the input manifest', () => {
        const pkg = {dependencies: {lodash: 'catalog:'}};
        resolvePackageCatalog(workspace, pkg);

        assert.deepStrictEqual(pkg, {dependencies: {lodash: 'catalog:'}});
    });

    it('throws when a default catalog entry is missing', () => {
        assert.throws(
            () => resolvePackageCatalog(workspace, {dependencies: {missing: 'catalog:'}}),
            /Could not resolve catalog dependency missing from catalog default/
        );
    });

    it('throws when a named catalog does not exist', () => {
        assert.throws(
            () => resolvePackageCatalog(workspace, {dependencies: {react: 'catalog:react99'}}),
            /Could not resolve catalog dependency react from catalog react99/
        );
    });

    it('throws when a dependency is absent from an existing named catalog', () => {
        assert.throws(
            () => resolvePackageCatalog(workspace, {dependencies: {lodash: 'catalog:react17'}}),
            /Could not resolve catalog dependency lodash from catalog react17/
        );
    });
});

describe('loadPackage (against the live repo)', () => {
    it('parses a package manifest present in the base commit', async () => {
        const manifest = await loadPackage('HEAD', 'package.json');
        assert.strictEqual(typeof manifest.name, 'string');
    });

    it('returns null when the package is absent from the base commit (new package)', async () => {
        const manifest = await loadPackage('HEAD', 'apps/does-not-exist/package.json');
        assert.strictEqual(manifest, null);
    });
});

describe('getPublishablePackages (against the live workspace)', () => {
    it('returns publishable packages with the documented shape', async () => {
        const wksp = await getWorkspace();
        const pkgs = await getPublishablePackages(wksp);

        assert.ok(pkgs.length > 0, 'expected at least one publishable package');

        for (const pkg of pkgs) {
            assert.strictEqual(typeof pkg.name, 'string');
            assert.strictEqual(typeof pkg.pkgPath, 'string');
            assert.ok(pkg.pkgPath.endsWith('package.json'));
            assert.strictEqual(typeof pkg.dir, 'string');
            assert.strictEqual(pkg.manifest.name, pkg.name);
        }
    });

    it('excludes private and ignored packages', async () => {
        const wksp = await getWorkspace();
        const pkgs = await getPublishablePackages(wksp);
        const names = new Set(pkgs.map(p => p.name));

        // none of the returned manifests may be marked private
        assert.ok(pkgs.every(p => !p.manifest.private));

        // everything in versioning.ignore must be filtered out
        for (const ignored of wksp.versioning?.ignore ?? []) {
            assert.ok(!names.has(ignored), `${ignored} is in versioning.ignore but was returned`);
        }
    });
});
