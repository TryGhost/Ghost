import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildMatrix, cdnPathsFor } from '../release/build-publish-matrix.ts';
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

  it('flattens cdn_paths to a newline-delimited string for the purge step', () => {
    const [portal] = buildMatrix(['@tryghost/portal']);
    assert.strictEqual(
      portal?.cdn_paths,
      'https://cdn.jsdelivr.net/ghost/portal@~CURRENT_MINOR/umd/portal.min.js',
    );
  });

  it('includes every asset for a multi-asset app, not just the bundle', () => {
    // sodo-search ships a stylesheet alongside its JS. This is the case the
    // old hand-maintained cdnPaths list had to remember and derivation gets
    // for free.
    const [sodoSearch] = buildMatrix(['@tryghost/sodo-search']);
    assert.deepStrictEqual(sodoSearch?.cdn_paths.split('\n'), [
      'https://cdn.jsdelivr.net/ghost/sodo-search@~CURRENT_MINOR/umd/sodo-search.min.js',
      'https://cdn.jsdelivr.net/ghost/sodo-search@~CURRENT_MINOR/umd/main.css',
    ]);
  });
});

describe('cdnPathsFor', () => {
  it('substitutes the defaults.json version placeholder', () => {
    assert.deepStrictEqual(
      cdnPathsFor({
        url: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/x.min.js',
        version: '1.2',
      }),
      ['https://cdn.jsdelivr.net/ghost/x@~CURRENT_MINOR/umd/x.min.js'],
    );
  });

  it('picks up every URL field, so a newly added asset is purged automatically', () => {
    const paths = cdnPathsFor({
      url: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/x.min.js',
      styles: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/main.css',
      somethingNew: 'https://cdn.jsdelivr.net/ghost/x@~{version}/umd/extra.js',
      version: '1.2',
    });
    assert.strictEqual(paths.length, 3);
    assert.ok(paths.every((p) => p.includes('CURRENT_MINOR')));
  });

  it('never treats the version field itself as a URL', () => {
    assert.deepStrictEqual(cdnPathsFor({ version: '1.2' }), []);
  });
});

describe('publish-manifest.json <-> defaults.json contract', () => {
  it('every CDN package resolves to a defaults.json entry', () => {
    for (const pkg of CDN_PACKAGES) {
      assert.ok(
        DEFAULTS[pkg.cdn!],
        `${pkg.name} has cdn key "${pkg.cdn}" with no defaults.json entry`,
      );
    }
  });

  it('every CDN package yields at least one URL to purge', () => {
    for (const pkg of CDN_PACKAGES) {
      assert.ok(
        cdnPathsFor(DEFAULTS[pkg.cdn!]!).length > 0,
        `${pkg.name} would publish with an empty purge list`,
      );
    }
  });

  it('purges exactly the URLs core serves, with only the version differing', () => {
    for (const entry of buildMatrix(CDN_PACKAGES.map((pkg) => pkg.name))) {
      const pkg = CDN_PACKAGES.find((p) => p.name === entry.package_name)!;
      const served = Object.values(DEFAULTS[pkg.cdn!]!)
        .filter((v) => v.startsWith('https://'))
        .map((v) => v.replaceAll('{version}', 'CURRENT_MINOR'));
      assert.deepStrictEqual(entry.cdn_paths.split('\n'), served, entry.package_name);
    }
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
    assert.throws(() => normalizeManifest([{ ...shade, distTag: 'latest' }]), /other than latest/);
    assert.deepStrictEqual(normalizeManifest([{ ...shade, distTag: 'alpha' }]), [
      { ...shade, distTag: 'alpha' },
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
