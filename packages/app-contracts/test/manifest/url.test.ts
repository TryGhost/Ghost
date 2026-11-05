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
    for (const spelling of ['//', '\\\\', '/\\', ' //', '/\t/']) {
      expect(surfaceUrlError(`${spelling}podcast.example.com/admin`)).toBe(PATH_PROBLEM);
    }
    // Whatever host the manifest is served from.
    for (const host of ['manifest-a.invalid', 'manifest-b.invalid']) {
      const manifestUrl = `https://${host}/ghost-app.json`;
      const parsed = manifest({
        manifest_url: manifestUrl,
        surfaces: [{ type: 'admin_page', url: `//${host}/admin` }],
      });
      expect(errorsOf(parsed, { ...options, manifestUrl })).toEqual([
        expect.objectContaining({ path: 'surfaces[0].url', message: PATH_PROBLEM }),
      ]);
    }
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

  it('rejects a URL Ghost loads that does not give Admin a route to open the app at', () => {
    // Admin opens the app at the page's path, query and fragment. `//admin` would name a host,
    // and the SDK refuses a route with a `\`, which the URL parser leaves in a query or fragment.
    const message =
      'Expected a URL that resolves to a path starting with a single /, with no \\ in its query or fragment';
    for (const url of [
      '/.//admin',
      '/a/..//admin',
      './/admin',
      '/.\\/admin',
      '/admin?next=\\episodes',
      '/admin#\\episodes',
    ]) {
      expect(surfaceUrlError(url), url).toBe(message);
    }
    expect(errorsOf(manifest({ icon: { url: '/.//icon.svg' } }))).toEqual([
      { path: 'icon.url', message },
    ]);
  });

  it('rejects a relative URL that resolves to a path starting with //', () => {
    const errors = errorsOf(manifest({ surfaces: [{ type: 'admin_page', url: 'admin' }] }), {
      ...options,
      manifestUrl: 'https://podcast.example.com//ghost-app.json',
    });
    expect(errors).toEqual([
      { path: 'surfaces[0].url', message: expect.stringContaining('resolves to a path') },
    ]);
  });

  it('accepts the routes Admin can open, and anything in a URL only linked to', () => {
    // A `\` in the path is read as `/`, so it never reaches the route.
    for (const [url, resolved] of [
      ['/admin//episodes', 'https://podcast.example.com/admin//episodes'],
      ['/%2F%2Fadmin', 'https://podcast.example.com/%2F%2Fadmin'],
      ['/admin?next=//other.example', 'https://podcast.example.com/admin?next=//other.example'],
      ['/admin\\episodes', 'https://podcast.example.com/admin/episodes'],
    ]) {
      const parsed = manifestOf(manifest({ surfaces: [{ type: 'admin_page', url }] }));
      expect(parsed.surfaces[0]?.url, url).toBe(resolved);
    }
    for (const url of ['https://example.com//about', 'https://example.com/about?a=\\b']) {
      const author = { name: 'Example Audio', url };
      expect(manifestOf(manifest({ author })).author.url, url).toBe(url);
    }
  });

  it('applies the same rules to the icon', () => {
    expect(manifestOf(manifest({ icon: { url: '/icon.svg' } })).icon).toEqual({
      url: 'https://podcast.example.com/icon.svg',
    });
    expect(errorsOf(manifest({ icon: { url: 'https://cdn.example.com/icon.svg' } }))).toEqual([
      { path: 'icon.url', message: PATH_PROBLEM },
    ]);
  });

  // Every path is on the manifest's origin, so the manifest's address is the one checked.
  it('rejects the manifest whole when it is served from the site’s or Admin’s host, on any port', () => {
    for (const manifestUrl of [
      'https://site.example.com/content/files/ghost-app.json',
      'https://site.example.com:8443/ghost-app.json',
      'https://admin.example.com:8443/ghost-app.json',
    ]) {
      expect(
        errorsOf(manifest({ manifest_url: manifestUrl }), { ...options, manifestUrl }),
      ).toEqual([{ path: '', message: expect.stringContaining('Ghost itself is served from') }]);
    }
  });

  it('accepts a manifest on a sibling of the site’s host', () => {
    const manifestUrl = 'https://app.site.example.com/ghost-app.json';
    expect(
      manifestOf(manifest({ manifest_url: manifestUrl }), { ...options, manifestUrl }).surfaces,
    ).toEqual([{ type: 'admin_page', url: 'https://app.site.example.com/admin' }]);
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
    expect(parsed.surfaces[0]?.url).toBe('http://my-app.localhost:8787/admin');
    expect(parsed.icon).toEqual({ url: 'http://my-app.localhost:8787/icon.svg' });
  });

  it('still rejects a manifest on Ghost’s host, on any port', () => {
    for (const manifestUrl of [
      'http://localhost:2368/ghost-app.json',
      'http://localhost:8787/ghost-app.json',
    ]) {
      expect(
        errorsOf(devManifest({ manifest_url: manifestUrl }), { ...devOptions, manifestUrl }),
      ).toEqual([{ path: '', message: expect.stringContaining('Ghost itself is served from') }]);
    }
  });
});
