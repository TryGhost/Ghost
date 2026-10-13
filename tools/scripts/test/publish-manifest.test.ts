import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  CDN_PACKAGES,
  DEFAULTS_PATH,
  DEFAULTS_REPO_PATH,
  continuousPackage,
  majorMinor,
  readDefaults,
} from '../lib/publish-manifest.ts';
import { readJson } from '../lib/utils.ts';
import { ROOT_DIR } from '../lib/constants.ts';

describe('majorMinor', () => {
  it('reduces a version to its major.minor line', () => {
    assert.strictEqual(majorMinor('2.69.16'), '2.69');
    assert.strictEqual(majorMinor('0.1.11'), '0.1');
    assert.strictEqual(majorMinor('10.20.30'), '10.20');
  });

  it('ignores prerelease and build metadata', () => {
    assert.strictEqual(majorMinor('6.19.0-rc.0'), '6.19');
    assert.strictEqual(majorMinor('1.2.3+build.5'), '1.2');
  });

  it('accepts a leading v', () => {
    assert.strictEqual(majorMinor('v6.17.1'), '6.17');
  });

  it('rejects anything that is not a full semver version', () => {
    for (const bad of ['garbage', '1.2', '', '01.2.3', '1.2.3.4']) {
      assert.throws(() => majorMinor(bad), /Invalid semver version/, `expected "${bad}" to throw`);
    }
  });
});

describe('continuousPackage', () => {
  it('finds a manifest package', () => {
    assert.strictEqual(continuousPackage('@tryghost/comments-ui')?.cdn, 'comments');
  });

  it('is undefined for a package outside the lane', () => {
    assert.strictEqual(continuousPackage('@tryghost/admin'), undefined);
  });
});

describe('paths', () => {
  it('resolves defaults.json to a file that exists', () => {
    assert.ok(existsSync(DEFAULTS_PATH));
  });

  it('derives the absolute path from the repo-relative one', () => {
    assert.ok(DEFAULTS_PATH.endsWith(`/${DEFAULTS_REPO_PATH}`));
  });
});

describe('the major.minor invariant', () => {
  // This is the rule release-apps writes and check-app-version-bump verifies.
  // If the repo ever violates it, one of those two is broken — or someone
  // hand-edited a version without running "pnpm ship".
  it('holds for every CDN package in the repo right now', async () => {
    const defaults = await readDefaults();

    for (const pkg of CDN_PACKAGES) {
      const { version } = await readJson<{ version: string }>(
        join(ROOT_DIR, pkg.path, 'package.json'),
      );

      assert.strictEqual(
        defaults[pkg.cdn!]?.version,
        majorMinor(version),
        `${pkg.name}: package.json is ${version}, defaults.json says ${defaults[pkg.cdn!]?.version}`,
      );
    }
  });
});
