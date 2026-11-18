import assert from 'node:assert/strict';

import { describe, expect, it } from 'vitest';

import {
  AppManifestSchema,
  formatManifestErrors,
  parseManifest,
  parseManifestUrl,
  type ParseManifestOptions,
} from '../../src/manifest/index.ts';
import {
  BACKEND_KEY,
  IDENTITY_KEY,
  devOptions,
  errorsOf,
  manifest,
  manifestOf,
  options,
} from './helpers.ts';

describe('parseManifest', () => {
  it('hands back the manifest it was given, normalised', () => {
    expect(manifestOf(manifest())).toEqual({
      id: 'com.example.podcast',
      name: 'Podcast',
      description: 'Publish episodes.',
      author: { name: 'Example Audio', url: 'https://example.com/' },
      accent_color: '#ff5500',
      icon: { url: 'https://podcast.example.com/icon.svg' },
      surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
      manifest_url: 'https://podcast.example.com/ghost-app.json',
      identity_key: IDENTITY_KEY,
      backend_key: BACKEND_KEY,
      development: false,
    });
  });

  // What's stored holds the resolved URLs, so it's read back with the stored manifest's
  // schema, not parsed again.
  it('hands back a manifest the stored manifest’s schema reads unchanged', () => {
    const parsed = manifestOf(manifest({ name: ' Podcast ' }));
    expect(AppManifestSchema.parse(parsed)).toEqual(parsed);
  });

  it('trims the name and description', () => {
    const parsed = manifestOf(manifest({ name: '  Podcast ', description: ' Episodes. ' }));
    expect(parsed.name).toBe('Podcast');
    expect(parsed.description).toBe('Episodes.');
  });

  describe('the URL it was fetched from', () => {
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

    it('is what the manifest names as its manifest_url', () => {
      const result = parseManifest(manifest(), {
        ...options,
        manifestUrl: 'https://copies.example.net/ghost-app.json',
      });
      expect(result).toEqual({
        success: false,
        reason: 'manifest_url_mismatch',
        errors: [
          {
            path: 'manifest_url',
            message:
              'Expected https://copies.example.net/ghost-app.json, the address the manifest was read from',
          },
        ],
      });
    });

    it('is compared as the URL parser reads it', () => {
      const manifestUrl = 'https://Podcast.Example.com/ghost-app.json';
      expect(manifestOf(manifest(), { ...options, manifestUrl }).manifest_url).toBe(
        'https://podcast.example.com/ghost-app.json',
      );
    });

    it('is only compared once the manifest is valid, so every problem is reported first', () => {
      const result = parseManifest(manifest({ name: '' }), {
        ...options,
        manifestUrl: 'https://copies.example.net/ghost-app.json',
      });
      expect(result).toMatchObject({ success: false, reason: 'invalid' });
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

describe('parseManifestUrl', () => {
  type UrlRules = Omit<ParseManifestOptions, 'manifestUrl'>;

  function manifestUrlOf(input: string, rules: UrlRules = options) {
    const result = parseManifestUrl(input, rules);
    assert(result.success, 'Expected the manifest URL to be accepted');
    return result.manifestUrl;
  }

  function errorOf(input: string, rules: UrlRules = options) {
    const result = parseManifestUrl(input, rules);
    assert(!result.success, 'Expected the manifest URL to be rejected');
    return result.error;
  }

  it('accepts an https address', () => {
    expect(manifestUrlOf('https://podcast.example.com/ghost-app.json')).toBe(
      'https://podcast.example.com/ghost-app.json',
    );
  });

  it('hands the address back as the URL parser reads it, not as it was given', () => {
    expect(manifestUrlOf(' https://Podcast.Example.com/x\n/ghost-app.json\n')).toBe(
      'https://podcast.example.com/x/ghost-app.json',
    );
  });

  it.each(['#install', '#'])('refuses a fragment, even an empty one: %s', (fragment) => {
    expect(errorOf(`https://podcast.example.com/ghost-app.json${fragment}`)).toBe(
      'Expected a URL without a fragment for the manifest itself',
    );
  });

  it('must be a URL', () => {
    expect(errorOf('podcast.example.com/app.json')).toBe('Expected the manifest at a URL');
  });

  it('follows the same rules as the URLs inside a manifest', () => {
    const withPassword = new URL('https://podcast.example.com/app.json');
    withPassword.username = 'user';
    withPassword.password = 'example';
    expect(errorOf(withPassword.href)).toBe(
      'Expected a URL without a username or password for the manifest itself',
    );
    expect(errorOf('http://podcast.example.com/app.json')).toBe(
      'Expected an https URL for the manifest itself',
    );
    expect(errorOf(`https://podcast.example.com/${'a'.repeat(2000)}`)).toBe(
      'Expected at most 2000 characters for the manifest itself',
    );
    expect(errorOf('http://localhost:8787/app.json')).toContain('development');
  });

  it('refuses localhost outside development, whatever trailing dots it’s written with', () => {
    for (const input of [
      'https://localhost.:8787/app.json',
      'https://localhost..:8787/app.json',
      'https://my-app.localhost../app.json',
      'https://127.0.0.1../app.json',
    ]) {
      expect(errorOf(input)).toContain('development');
    }
  });

  it('accepts localhost, over HTTP too, when Ghost runs in development', () => {
    for (const input of [
      'http://my-app.localhost:8787/app.json',
      'http://127.0.0.1:8787/app.json',
    ]) {
      expect(manifestUrlOf(input, devOptions)).toBe(input);
    }
  });

  it('refuses an address on the site’s or Admin’s host, on any port or scheme', () => {
    for (const input of [
      'https://site.example.com/ghost-app.json',
      'https://site.example.com:8443/ghost-app.json',
      'https://Site.Example.com./ghost-app.json',
      'https://admin.example.com:8443/ghost-app.json',
    ]) {
      expect(errorOf(input)).toBe(
        'Expected the manifest on a host other than the one Ghost itself is served from, on any port, as browsers send Ghost’s cookies to every port on its host',
      );
    }
  });

  it('refuses Ghost’s own name for the machine in development, and says what to use instead', () => {
    const suggestion =
      /on any port, .*\. To run the app on this machine too, serve it from a name of its own under \.localhost, such as my-app\.localhost$/;
    expect(errorOf('http://localhost:8787/app.json', devOptions)).toMatch(suggestion);
    expect(
      errorOf('http://127.0.0.1:8787/app.json', { ...devOptions, ghostUrls: ['http://127.0.0.1'] }),
    ).toMatch(suggestion);
    // A worktree's Ghost is on a name under .localhost itself.
    expect(
      errorOf('http://wt.ghost.localhost:8787/app.json', {
        ...devOptions,
        ghostUrls: ['http://wt.ghost.localhost:2400'],
      }),
    ).toMatch(suggestion);
  });

  it('refuses every address when it is not told where Ghost is served from', () => {
    for (const ghostUrls of [[], ['https://site.example.com', 'admin'], ['http://./']]) {
      expect(errorOf('https://podcast.example.com/app.json', { ghostUrls })).toBe(
        'Expected the URLs Ghost itself is served from',
      );
    }
  });
});

describe('formatManifestErrors', () => {
  it('lists each problem as `path: message`, and one for the whole without a path', () => {
    const errors = [
      { path: 'accent_color', message: 'Expected a hex colour' },
      { path: '', message: 'Expected a JSON object' },
    ];
    expect(formatManifestErrors(errors, '; ')).toBe(
      'accent_color: Expected a hex colour; Expected a JSON object',
    );
  });
});
