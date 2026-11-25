import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildMatrix, cdnAlias } from '../release/build-publish-matrix.ts';
import { CDN_PACKAGES, CONTINUOUS_PACKAGES, normalizeManifest } from '../lib/publish-manifest.ts';

const DEFAULTS: Record<string, Record<string, string>> = JSON.parse(
  await readFile(
    resolve(import.meta.dirname, '../../../ghost/core/shared/config/defaults.json'),
    'utf8',
  ),
);

const allPackageNames = CONTINUOUS_PACKAGES.map((pkg) => pkg.name);

describe('buildMatrix', () => {
  it('returns an empty matrix when nothing is affected', () => {
    assert.deepStrictEqual(buildMatrix([]), []);
  });

  it('ignores affected projects that are not in the manifest', () => {
    assert.deepStrictEqual(buildMatrix(['ghost', '@tryghost/admin']), []);
  });

  it('filters to just the affected apps', () => {
    const matrix = buildMatrix(['@tryghost/portal', 'ghost']);
    assert.strictEqual(matrix.length, 1);
    assert.strictEqual(matrix[0]?.package_name, '@tryghost/portal');
    assert.strictEqual(matrix[0]?.package_path, 'apps/portal');
  });

  it('preserves manifest order regardless of affected order', () => {
    const matrix = buildMatrix([...allPackageNames].reverse());
    assert.deepStrictEqual(
      matrix.map((e) => e.package_name),
      allPackageNames,
    );
  });

  it('carries the versioning policy and dist-tag the publish job needs', () => {
    const [portal] = buildMatrix(['@tryghost/portal']);
    assert.strictEqual(portal?.versioning, 'patch');
    assert.strictEqual(portal?.dist_tag, 'latest');
    assert.strictEqual(portal?.install_args, '');
  });

  it('publishes Shade and the app SDK prereleases under latest', () => {
    // A plain `npm install` must get the newest alpha the docs describe; the
    // other prerelease packages keep their own tag.
    const tags = Object.fromEntries(
      buildMatrix(allPackageNames)
        .filter((entry) => entry.versioning === 'prerelease')
        .map((entry) => [entry.package_name, entry.dist_tag]),
    );
    assert.deepStrictEqual(tags, {
      '@tryghost/shade': 'latest',
      '@tryghost/adapter-base-upgrade': 'alpha',
      '@tryghost/app-sdk': 'latest',
    });
  });

  it('marks the packages Ghost serves from a CDN, so the publish job records their releases', () => {
    const cdn = Object.fromEntries(
      buildMatrix(['@tryghost/portal', '@tryghost/comments-ui', '@tryghost/shade']).map((entry) => [
        entry.package_name,
        entry.cdn,
      ]),
    );
    assert.deepStrictEqual(cdn, {
      '@tryghost/portal': 'portal',
      '@tryghost/comments-ui': 'comments',
      '@tryghost/shade': '',
    });
  });
});

describe('cdnAlias', () => {
  const pkg = normalizeManifest([
    { name: '@tryghost/x', path: 'apps/x', versioning: 'patch', cdn: 'x' },
  ])[0]!;

  it("puts the line defaults.json pins into the package's URLs", () => {
    assert.deepStrictEqual(
      cdnAlias(pkg, {
        x: { url: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/x.min.js', version: '1.2' },
      }),
      {
        cdn: 'x',
        package: '@tryghost/x',
        line: '1.2',
        urls: ['https://cdn.jsdelivr.net/ghost/x@~1.2/umd/x.min.js'],
      },
    );
  });

  it('picks up every URL field, so a newly added asset is purged automatically', () => {
    const alias = cdnAlias(pkg, {
      x: {
        url: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/x.min.js',
        styles: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/main.css',
        somethingNew: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/extra.js',
        version: '1.2',
      },
    });
    assert.deepStrictEqual(alias.urls, [
      'https://cdn.jsdelivr.net/ghost/x@~1.2/umd/x.min.js',
      'https://cdn.jsdelivr.net/ghost/x@~1.2/umd/main.css',
      'https://cdn.jsdelivr.net/ghost/x@~1.2/umd/extra.js',
    ]);
  });

  it('refuses a package with no URL to purge, or no defaults.json entry', () => {
    assert.throws(() => cdnAlias(pkg, { x: { version: '1.2' } }), /has no CDN URLs to purge/);
    assert.throws(() => cdnAlias(pkg, {}), /which defaults.json does not define/);
  });
});

describe('publish-manifest.json <-> defaults.json contract', () => {
  it('every CDN package has an alias to purge: exactly the URLs core serves, in the line it pins', () => {
    for (const pkg of CDN_PACKAGES) {
      const entry = DEFAULTS[pkg.cdn!]!;
      const served = Object.values(entry)
        .filter((v) => v.startsWith('https://'))
        .map((v) => v.replaceAll('{version}', entry.version!));
      assert.ok(served.length > 0, `${pkg.name} would publish with an empty purge list`);
      assert.deepStrictEqual(cdnAlias(pkg, DEFAULTS).urls, served, pkg.name);
    }
  });

  it('includes every asset for a multi-asset app, not just the bundle', () => {
    // sodo-search ships a stylesheet alongside its JS.
    const sodoSearch = CDN_PACKAGES.find((pkg) => pkg.name === '@tryghost/sodo-search')!;
    assert.deepStrictEqual(
      cdnAlias(sodoSearch, DEFAULTS).urls.map((url) => url.split('/umd/')[1]),
      ['sodo-search.min.js', 'main.css'],
    );
  });
});

describe('normalizeManifest', () => {
  const portal = {
    name: '@tryghost/portal',
    path: 'apps/portal',
    versioning: 'patch',
    cdn: 'portal',
  };

  it('defaults the dist-tag to latest for a patch package', () => {
    assert.deepStrictEqual(normalizeManifest([portal]), [{ ...portal, distTag: 'latest' }]);
  });

  it('requires a prerelease package to name its dist-tag', () => {
    const shade = { name: '@tryghost/shade', path: 'apps/shade', versioning: 'prerelease' };
    assert.throws(() => normalizeManifest([shade]), /must name a distTag/);
    assert.deepStrictEqual(normalizeManifest([{ ...shade, distTag: 'alpha' }]), [
      { ...shade, distTag: 'alpha' },
    ]);
  });

  it('lets a prerelease package opt into latest by naming it', () => {
    const shade = { name: '@tryghost/shade', path: 'apps/shade', versioning: 'prerelease' };
    assert.deepStrictEqual(normalizeManifest([{ ...shade, distTag: 'latest' }]), [
      { ...shade, distTag: 'latest' },
    ]);
  });

  it('rejects an unknown policy, a duplicate, and a cdn key on a prerelease', () => {
    assert.throws(
      () => normalizeManifest([{ ...portal, versioning: 'minor' }]),
      /expected one of "patch"\|"prerelease"[\s\S]*versioning/,
    );
    assert.throws(() => normalizeManifest([portal, portal]), /listed twice/);
    assert.throws(
      () => normalizeManifest([{ ...portal, versioning: 'prerelease', distTag: 'alpha' }]),
      /only patch-versioned packages/,
    );
  });

  it('rejects a misspelt key rather than ignoring it', () => {
    assert.throws(
      () => normalizeManifest([{ ...portal, dist_tag: 'next' }]),
      /Unrecognized key: "dist_tag"/,
    );
  });

  it('rejects anything that is not an array of entries', () => {
    assert.throws(() => normalizeManifest({ name: 'x' }), /expected array/);
    assert.throws(() => normalizeManifest([{ path: 'apps/x', versioning: 'patch' }]), /name/);
  });
});
