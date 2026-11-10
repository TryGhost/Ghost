// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { generateKey, publicKeyOf, signAppManifest } from '../src/tooling/index.ts';
import { SOURCE } from './helpers.ts';

// The manifest's own field limits keep it far below the 64 KB Ghost stores, so the limit is
// lowered to one this manifest fits as written, but not once its paths are resolved.
const { LIMIT } = vi.hoisted(() => ({ LIMIT: 480 }));
vi.mock('../src/tooling/limits.ts', async (original) => ({
  ...(await original<typeof import('../src/tooling/limits.ts')>()),
  MANIFEST_MAX_BYTES: LIMIT,
}));

const MANIFEST_URL = 'http://localhost/ghost-app.json';
const identityKey = generateKey();
const backendKey = generateKey();
const manifest = {
  ...SOURCE,
  manifest_url: MANIFEST_URL,
  identity_key: publicKeyOf(identityKey),
  backend_key: publicKeyOf(backendKey),
  development: true,
};

describe("Ghost's limit on the manifest it stores", () => {
  it('refuses to sign a manifest Ghost would store as too large', async () => {
    const result = await signAppManifest(SOURCE, {
      manifestUrl: MANIFEST_URL,
      identityKey,
      backendKey,
      development: true,
    });
    expect(result).toMatchObject({ success: false, code: 'APP_MANIFEST_TOO_LARGE' });
  });

  it('measures the manifest with its paths resolved, as Ghost stores it', async () => {
    const { storedSize } = await import('../src/tooling/limits.ts');
    const { parseManifest } = await import('@tryghost/app-contracts/manifest');
    const parsed = parseManifest(manifest, {
      manifestUrl: MANIFEST_URL,
      ghostUrls: ['https://ghost.invalid/'],
      allowLocalhost: true,
    });
    expect(parsed.success).toBe(true);
    const size = parsed.success ? storedSize(parsed.manifest) : 0;
    expect(JSON.stringify(manifest).length).toBeLessThanOrEqual(LIMIT);
    expect(size).toBeGreaterThan(LIMIT);
  });
});
