import assert from 'node:assert/strict';

import { parseManifest, type ParseManifestOptions } from '../../src/manifest/index.ts';

export const options: ParseManifestOptions = {
  manifestUrl: 'https://podcast.example.com/ghost-app.json',
  ghostUrls: ['https://site.example.com', 'https://admin.example.com/ghost/'],
};

export const devOptions: ParseManifestOptions = {
  manifestUrl: 'http://localhost:8787/ghost-app.json',
  ghostUrls: ['http://localhost:2368'],
  allowLocalhost: true,
};

export const IDENTITY_KEY = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX_s',
} as const;

export const BACKEND_KEY = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'H7aU67-okztSJD3-0znkVDiCU-izOI3I851CZX8XDyk',
} as const;

export function manifest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes.',
    author: { name: 'Example Audio', url: 'https://example.com' },
    accent_color: '#FF5500',
    icon: { url: '/icon.svg' },
    surfaces: [{ type: 'admin_page', url: '/admin' }],
    manifest_url: 'https://podcast.example.com/ghost-app.json',
    identity_key: IDENTITY_KEY,
    backend_key: BACKEND_KEY,
    development: false,
    ...overrides,
  };
}

export function devManifest(overrides: Record<string, unknown> = {}) {
  return manifest({
    manifest_url: 'http://localhost:8787/ghost-app.json',
    development: true,
    ...overrides,
  });
}

export function errorsOf(input: unknown, parseOptions = options) {
  const result = parseManifest(input, parseOptions);
  assert(!result.success, 'Expected the manifest to be rejected');
  return result.errors;
}

export function manifestOf(input: unknown, parseOptions = options) {
  const result = parseManifest(input, parseOptions);
  assert(result.success, 'Expected the manifest to be valid');
  return result.manifest;
}
