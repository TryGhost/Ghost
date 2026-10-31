import { describe, expect, it } from 'vitest';

import { devManifest, devOptions, errorsOf, manifest, manifestOf, options } from './helpers.ts';

const PATH_PROBLEM = 'Expected a path on the manifest’s own origin, such as /admin';

describe('paths', () => {
  function surfaceUrlError(url: unknown, parseOptions = options) {
    const errors = errorsOf(manifest({ surfaces: [{ type: 'admin_page', url }] }), parseOptions);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.path).toBe('surfaces[0].url');
    return errors[0]?.message;
  }

  function surfaceUrlOf(url: string, parseOptions = options) {
    return manifestOf(manifest({ surfaces: [{ type: 'admin_page', url }] }), parseOptions)
      .surfaces[0]?.url;
  }

  it('resolves against the address the manifest was fetched from', () => {
    expect(surfaceUrlOf('/admin')).toBe('https://podcast.example.com/admin');
    expect(surfaceUrlOf('admin')).toBe('https://podcast.example.com/admin');
    expect(surfaceUrlOf('/admin?tab=1')).toBe('https://podcast.example.com/admin?tab=1');
    expect(
      manifestOf(
        manifest({
          manifest_url: 'https://podcast.example.com/v2/ghost-app.json',
          surfaces: [{ type: 'admin_page', url: 'admin' }],
        }),
        { ...options, manifestUrl: 'https://podcast.example.com/v2/ghost-app.json' },
      ).surfaces[0]?.url,
    ).toBe('https://podcast.example.com/v2/admin');
  });

  // An app is one origin: the one Ghost fetches its manifest from and challenges.
  it('rejects a URL that names its own origin, even the manifest’s', () => {
    expect(surfaceUrlError('https://podcast.example.com/admin')).toBe(PATH_PROBLEM);
    expect(surfaceUrlError('https://audio.example.org/admin')).toBe(PATH_PROBLEM);
    expect(surfaceUrlError('//audio.example.org/admin')).toBe(PATH_PROBLEM);
    expect(surfaceUrlError('javascript:alert(1)')).toBe(PATH_PROBLEM);
    expect(surfaceUrlError('data:text/html,<script>alert(1)</script>')).toBe(PATH_PROBLEM);
  });

  // Each would be the manifest itself.
  it('rejects an empty path, or one that is only a query or fragment', () => {
    for (const path of ['', '?tab=1', '#admin', 'ghost-app.json', '/ghost-app.json#x']) {
      expect(surfaceUrlError(path)).toBe(PATH_PROBLEM);
    }
  });

  it('rejects values that aren’t strings', () => {
    expect(surfaceUrlError(42)).toBe(PATH_PROBLEM);
  });

  it('measures a path as the URL it resolves to', () => {
    const base = 'https://podcast.example.com/';
    const path = `/${'a'.repeat(2000 - base.length)}`;
    expect(surfaceUrlOf(path)).toHaveLength(2000);
    expect(surfaceUrlError(`${path}a`)).toContain('at most 2000');
  });

  it('applies the same rules to the icon', () => {
    expect(manifestOf(manifest({ icon: { url: '/icon.svg' } })).icon).toEqual({
      url: 'https://podcast.example.com/icon.svg',
    });
    expect(errorsOf(manifest({ icon: { url: 'https://cdn.example.com/icon.svg' } }))).toEqual([
      { path: 'icon.url', message: PATH_PROBLEM },
    ]);
  });

  // Ghost fetches it server-side and never loads it as a page, but nothing in it may load
  // from there.
  it('rejects every path when the manifest is served from the site or from Admin', () => {
    const manifestUrl = 'https://site.example.com/content/files/ghost-app.json';
    expect(errorsOf(manifest({ manifest_url: manifestUrl }), { ...options, manifestUrl })).toEqual([
      { path: 'icon.url', message: expect.stringContaining('Ghost itself') },
      { path: 'surfaces[0].url', message: expect.stringContaining('Ghost itself') },
    ]);
  });

  it('leaves the author’s link absolute, on any origin', () => {
    expect(
      manifestOf(manifest({ author: { name: 'Example Audio', url: 'https://site.example.com' } }))
        .author.url,
    ).toBe('https://site.example.com/');
    expect(errorsOf(manifest({ author: { name: 'Example Audio', url: '/about' } }))).toEqual([
      { path: 'author.url', message: 'Expected an absolute URL' },
    ]);
    expect(
      errorsOf(manifest({ author: { name: 'Example Audio', url: 'http://example.com' } })),
    ).toEqual([{ path: 'author.url', message: 'Expected an https URL' }]);
  });
});

describe('localhost', () => {
  it('resolves paths against a manifest on localhost in development', () => {
    const parsed = manifestOf(devManifest(), devOptions);
    expect(parsed.surfaces[0]?.url).toBe('http://localhost:8787/admin');
    expect(parsed.icon).toEqual({ url: 'http://localhost:8787/icon.svg' });
  });

  it('still rejects a manifest on the port Ghost is served from', () => {
    const manifestUrl = 'http://localhost:2368/ghost-app.json';
    expect(
      errorsOf(devManifest({ manifest_url: manifestUrl }), { ...devOptions, manifestUrl }),
    ).toEqual([
      { path: 'icon.url', message: expect.stringContaining('Ghost itself') },
      { path: 'surfaces[0].url', message: expect.stringContaining('Ghost itself') },
    ]);
  });
});
