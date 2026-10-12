import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const { computeNextVersion, latestVersionInLine } = createRequire(import.meta.url)(
  '../compute-next-app-version.cjs',
) as {
  computeNextVersion: (current: string, published: string[]) => string;
  latestVersionInLine: (current: string, published: string[]) => string | null;
};

describe('automatic release versions', () => {
  it('keeps stable app releases on their existing major.minor line', () => {
    assert.equal(computeNextVersion('2.69.0', []), '2.69.0');
    const versions = ['2.69.2', '2.69.10', '2.69.20-alpha.0', '2.70.0'];
    assert.equal(latestVersionInLine('2.69.0', versions), '2.69.10');
    assert.equal(computeNextVersion('2.69.0', versions), '2.69.11');
  });

  it('starts a new alpha series at the committed version', () => {
    assert.equal(computeNextVersion('0.1.0-alpha.0', []), '0.1.0-alpha.0');
    assert.equal(computeNextVersion('0.2.0-alpha.0', ['0.1.0-alpha.9']), '0.2.0-alpha.0');
  });

  it('increments the highest alpha in the same series numerically', () => {
    const versions = [
      '0.1.0-alpha.2',
      '0.1.0-alpha.10',
      '0.1.1-alpha.20',
      '0.1.0-beta.30',
      '0.1.0',
    ];
    assert.equal(latestVersionInLine('0.1.0-alpha.0', versions), '0.1.0-alpha.10');
    assert.equal(computeNextVersion('0.1.0-alpha.0', versions), '0.1.0-alpha.11');
  });
});
