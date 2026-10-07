import assert from 'node:assert/strict';

import { describe, expect, it } from 'vitest';

import { parseManifest } from '../../src/manifest/index.ts';
import { devOptions, errorsOf, manifest, manifestOf, options } from './helpers.ts';

describe('parseManifest', () => {
  it('resolves relative URLs against where the manifest was fetched from', () => {
    expect(manifestOf(manifest())).toEqual({
      id: 'com.example.podcast',
      name: 'Podcast',
      description: 'Publish episodes.',
      author: { name: 'Example Audio', url: 'https://example.com/' },
      accent_color: '#ff5500',
      icon: { url: 'https://podcast.example.com/icon.svg' },
      surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
    });
  });

  it('gives the same manifest a different home when it is served from elsewhere', () => {
    expect(manifestOf(manifest(), devOptions).surfaces).toEqual([
      { type: 'admin_page', url: 'http://localhost:8787/admin' },
    ]);
  });

  it('accepts a manifest it has already parsed, unchanged', () => {
    const parsed = manifestOf(manifest({ name: ' Podcast ' }));
    expect(manifestOf(parsed)).toEqual(parsed);
  });

  it('accepts absolute URLs on another host', () => {
    const parsed = manifestOf(
      manifest({
        icon: { url: 'https://cdn.example.net/icon.svg' },
        surfaces: [{ type: 'admin_page', url: 'https://app.example.net/ghost' }],
      }),
    );
    expect(parsed.icon).toEqual({ url: 'https://cdn.example.net/icon.svg' });
    expect(parsed.surfaces[0]?.url).toBe('https://app.example.net/ghost');
  });

  it('trims the name and description', () => {
    const parsed = manifestOf(manifest({ name: '  Podcast ', description: ' Episodes. ' }));
    expect(parsed.name).toBe('Podcast');
    expect(parsed.description).toBe('Episodes.');
  });

  describe('the manifest URL', () => {
    it('is handed back as it was checked, not as it was given', () => {
      const result = parseManifest(manifest(), {
        ...options,
        manifestUrl: ' https://Podcast.Example.com/x\n/ghost-app.json\n',
      });
      assert(result.success);
      expect(result.manifestUrl).toBe('https://podcast.example.com/x/ghost-app.json');
    });

    it('must be a URL', () => {
      expect(errorsOf(manifest(), { ...options, manifestUrl: '/ghost-app.json' })).toEqual([
        { path: '', message: 'Expected the manifest at a URL' },
      ]);
    });

    it('follows the same rules as the URLs inside it', () => {
      expect(
        errorsOf(manifest(), { ...options, manifestUrl: 'http://podcast.example.com/app.json' }),
      ).toEqual([{ path: '', message: 'Expected an https URL for the manifest itself' }]);
      expect(
        errorsOf(manifest(), { ...options, manifestUrl: 'http://localhost:8787/app.json' }),
      ).toEqual([{ path: '', message: expect.stringContaining('development') }]);
      expect(
        errorsOf(manifest(), {
          ...options,
          manifestUrl: `https://podcast.example.com/${'a'.repeat(2000)}`,
        }),
      ).toEqual([
        { path: '', message: 'Expected at most 2000 characters for the manifest itself' },
      ]);
    });
  });

  it('accepts a site and an Admin served from the same place', () => {
    const sameHost = {
      ...options,
      ghostUrls: ['https://site.example.com', 'https://site.example.com/ghost/'],
    };
    expect(parseManifest(manifest(), sameHost).success).toBe(true);
  });

  it('rejects every manifest when it is not told where Ghost is served from', () => {
    const expected = [{ path: '', message: 'Expected the URLs Ghost itself is served from' }];
    expect(errorsOf(manifest(), { ...options, ghostUrls: [] })).toEqual(expected);
    expect(
      errorsOf(manifest(), { ...options, ghostUrls: ['https://site.example.com', 'admin'] }),
    ).toEqual(expected);
  });
});
