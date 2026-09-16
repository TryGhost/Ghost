import { describe, expect, it } from 'vitest';
import { verifyBundleIntegrity } from '../../src/integrity.ts';

describe('verifyBundleIntegrity', function () {
  it('accepts the matching sha256 digest and rejects mismatches', async function () {
    await expect(
      verifyBundleIntegrity(
        'verified source',
        'sha256-pNTkXhIbWgnQIZoB4NwhKnbLkZjwFqeemQHHIM8ySH8=',
      ),
    ).resolves.toBeUndefined();
    await expect(
      verifyBundleIntegrity(
        'changed source',
        'sha256-pNTkXhIbWgnQIZoB4NwhKnbLkZjwFqeemQHHIM8ySH8=',
      ),
    ).rejects.toThrow('integrity verification');
  });
});
