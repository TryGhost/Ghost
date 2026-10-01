import assert from 'node:assert/strict';

import { parseManifest, type ParseManifestOptions } from '../src/index.ts';

export const options: ParseManifestOptions = {
  manifestUrl: 'https://podcast.example.com/ghost-app.json',
  ghostUrls: ['https://site.example.com', 'https://admin.example.com/ghost/'],
};

export const devOptions: ParseManifestOptions = {
  manifestUrl: 'http://localhost:8787/ghost-app.json',
  ghostUrls: ['http://localhost:2368'],
  allowLocalhost: true,
};

export function manifest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes.',
    author: { name: 'Example Audio', url: 'https://example.com' },
    accent_color: '#FF5500',
    icon: { url: '/icon.svg' },
    surfaces: [{ type: 'admin_page', url: '/admin' }],
    ...overrides,
  };
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
