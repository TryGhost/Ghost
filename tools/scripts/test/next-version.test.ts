import { describe, it } from 'node:test';
import assert from 'node:assert';

import { latestInLine, nextVersion } from '../next-version.ts';

const published = ['2.69.3', '2.69.4', '2.70.0', '2.70.1', '2.70.2', '2.70.5-beta.1', '3.0.0'];

describe('patch policy', () => {
  it('publishes the next patch above the highest stable release in the line', () => {
    assert.strictEqual(latestInLine('patch', '2.70.0', published), '2.70.2');
    assert.strictEqual(nextVersion('patch', '2.70.0', published), '2.70.3');
  });

  it('ignores the package.json patch digit', () => {
    assert.strictEqual(nextVersion('patch', '2.70.9', published), '2.70.3');
  });

  it('ignores prereleases in the line', () => {
    assert.strictEqual(nextVersion('patch', '2.70.0', ['2.70.0', '2.70.5-beta.1']), '2.70.1');
  });

  it('publishes package.json verbatim when the line is new', () => {
    assert.strictEqual(latestInLine('patch', '2.71.0', published), null);
    assert.strictEqual(nextVersion('patch', '2.71.0', published), '2.71.0');
    assert.strictEqual(nextVersion('patch', '1.0.0', []), '1.0.0');
  });
});

describe('prerelease policy', () => {
  const alphas = [
    '0.1.0-alpha.0',
    '0.1.0-alpha.1',
    '0.1.0-alpha.10',
    '0.1.0-beta.0',
    '0.1.1-alpha.0',
  ];

  it('publishes the next counter in the same X.Y.Z and tag', () => {
    assert.strictEqual(latestInLine('prerelease', '0.1.0-alpha.0', alphas), '0.1.0-alpha.10');
    assert.strictEqual(nextVersion('prerelease', '0.1.0-alpha.0', alphas), '0.1.0-alpha.11');
  });

  it('starts a new line verbatim', () => {
    assert.strictEqual(nextVersion('prerelease', '0.2.0-alpha.0', alphas), '0.2.0-alpha.0');
    assert.strictEqual(nextVersion('prerelease', '0.1.0-rc.0', alphas), '0.1.0-rc.0');
  });

  it('ignores stable releases and other tags', () => {
    assert.strictEqual(
      latestInLine('prerelease', '0.1.0-alpha.0', ['0.1.0', '0.1.0-beta.3']),
      null,
    );
  });

  it('rejects a stable package.json version', () => {
    assert.throws(() => nextVersion('prerelease', '0.1.0', alphas), /needs a prerelease version/);
  });
});

describe('invalid input', () => {
  it('rejects a non-semver package.json version', () => {
    assert.throws(() => nextVersion('patch', 'private', []), /Invalid version/);
  });
});
