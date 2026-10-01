import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';

import {
  APP_ID_MAX_LENGTH,
  isValidAppId,
  parseManifest,
  type ParseManifestOptions,
} from '../src/index.ts';

const options: ParseManifestOptions = {
  manifestUrl: 'https://podcast.example.com/ghost-app.json',
  ghostUrls: ['https://site.example.com', 'https://admin.example.com/ghost/'],
};

const devOptions: ParseManifestOptions = {
  manifestUrl: 'http://localhost:8787/ghost-app.json',
  ghostUrls: ['http://localhost:2368'],
  allowLocalhost: true,
};

function manifest(overrides: Record<string, unknown> = {}) {
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

function errorsOf(input: unknown, parseOptions = options) {
  const result = parseManifest(input, parseOptions);
  assert(!result.success, 'Expected the manifest to be rejected');
  return result.errors;
}

function manifestOf(input: unknown, parseOptions = options) {
  const result = parseManifest(input, parseOptions);
  assert(result.success, 'Expected the manifest to be valid');
  return result.manifest;
}

describe('isValidAppId', () => {
  it('accepts lowercase reverse-domain IDs', () => {
    expect(isValidAppId('com.example.podcast')).toBe(true);
    expect(isValidAppId('io.ghost.test-app')).toBe(true);
    expect(isValidAppId('dev.jonatan.cards2')).toBe(true);
    expect(isValidAppId('com.xn--bcher-kva.reader')).toBe(true);
  });

  it('rejects IDs that are not reverse-domain style', () => {
    expect(isValidAppId('podcast')).toBe(false);
    expect(isValidAppId('com..podcast')).toBe(false);
    expect(isValidAppId('.com.podcast')).toBe(false);
    expect(isValidAppId('com.podcast.')).toBe(false);
    expect(isValidAppId('com.example.pod_cast')).toBe(false);
    expect(isValidAppId('com.example.-podcast')).toBe(false);
    expect(isValidAppId('com.example.podcast-')).toBe(false);
    expect(isValidAppId('com.example.pod cast')).toBe(false);
    expect(isValidAppId('')).toBe(false);
  });

  it('rejects IDs that start with a digit, such as addresses and versions', () => {
    expect(isValidAppId('127.0.0.1')).toBe(false);
    expect(isValidAppId('1.2')).toBe(false);
    expect(isValidAppId('com.example.123')).toBe(true);
  });

  it('rejects uppercase rather than lowercasing it', () => {
    expect(isValidAppId('Com.Example.Podcast')).toBe(false);
  });

  it('rejects IDs longer than the index allows', () => {
    const longest = `com.${'a'.repeat(APP_ID_MAX_LENGTH - 4)}`;
    expect(longest).toHaveLength(APP_ID_MAX_LENGTH);
    expect(isValidAppId(longest)).toBe(true);
    expect(isValidAppId(`${longest}a`)).toBe(false);
  });

  it('rejects values that are not strings', () => {
    expect(isValidAppId(undefined)).toBe(false);
    expect(isValidAppId(42)).toBe(false);
    expect(isValidAppId(['com.example.podcast'])).toBe(false);
  });
});

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

  describe('shape', () => {
    it('rejects anything that is not an object', () => {
      expect(errorsOf(null)).toHaveLength(1);
      expect(errorsOf('{}')).toHaveLength(1);
      expect(errorsOf([manifest()])).toHaveLength(1);
    });

    it('rejects unknown fields at every level', () => {
      expect(errorsOf(manifest({ allowed_origins: ['https://podcast.example.com'] }))).toEqual([
        { path: '', message: expect.stringContaining('allowed_origins') },
      ]);
      expect(
        errorsOf(manifest({ surfaces: [{ type: 'admin_page', url: '/admin', label: 'Podcast' }] })),
      ).toEqual([{ path: 'surfaces[0]', message: expect.stringContaining('label') }]);
    });

    it('reports every problem, each with its path', () => {
      const errors = errorsOf({ id: 'Podcast', name: '', surfaces: [] });
      expect(errors.map((error) => error.path).sort()).toEqual([
        'accent_color',
        'author',
        'description',
        'icon',
        'id',
        'name',
        'surfaces',
      ]);
    });

    it('rejects a malformed ID', () => {
      expect(errorsOf(manifest({ id: 'Com.Example.Podcast' }))).toEqual([
        { path: 'id', message: expect.stringContaining('reverse-domain') },
      ]);
    });

    it('rejects a missing, empty or overlong name', () => {
      expect(errorsOf(manifest({ name: undefined }))[0]?.path).toBe('name');
      expect(errorsOf(manifest({ name: '   ' }))[0]?.path).toBe('name');
      expect(errorsOf(manifest({ name: 'a'.repeat(51) }))[0]?.path).toBe('name');
    });

    it('rejects a name or description that could read as something else', () => {
      for (const value of ['Pod\ncast', 'Pod\u202ecast', 'Pod\u0000cast', 'Pod\u2066cast']) {
        expect(errorsOf(manifest({ name: value }))).toEqual([
          { path: 'name', message: 'Expected plain text on one line' },
        ]);
        expect(errorsOf(manifest({ description: value }))).toEqual([
          { path: 'description', message: 'Expected plain text on one line' },
        ]);
      }
      expect(manifestOf(manifest({ name: 'Pödcast 🎙️' })).name).toBe('Pödcast 🎙️');
    });

    it('rejects a missing, empty, overlong or non-text description', () => {
      expect(errorsOf(manifest({ description: undefined }))[0]?.path).toBe('description');
      expect(errorsOf(manifest({ description: ' ' }))[0]?.path).toBe('description');
      expect(errorsOf(manifest({ description: 'a'.repeat(201) }))[0]?.path).toBe('description');
      expect(errorsOf(manifest({ description: 42 }))[0]?.path).toBe('description');
    });
  });

  describe('author', () => {
    it('needs a name and a link', () => {
      expect(
        manifestOf(manifest({ author: { name: ' Example Audio ', url: 'https://example.com/a' } }))
          .author,
      ).toEqual({ name: 'Example Audio', url: 'https://example.com/a' });
      expect(errorsOf(manifest({ author: undefined }))).toEqual([
        { path: 'author', message: 'Expected an author with a name and a url' },
      ]);
      expect(errorsOf(manifest({ author: { url: 'https://example.com' } }))[0]?.path).toBe(
        'author.name',
      );
      expect(errorsOf(manifest({ author: { name: 'Example Audio' } }))[0]?.path).toBe('author.url');
      const url = 'https://example.com';
      expect(errorsOf(manifest({ author: { name: 'a'.repeat(51), url } }))[0]?.path).toBe(
        'author.name',
      );
      expect(errorsOf(manifest({ author: { name: 'Example\u202eAudio', url } }))[0]?.path).toBe(
        'author.name',
      );
    });

    it('holds the link to the same URL rules', () => {
      expect(errorsOf(manifest({ author: { name: 'A', url: 'javascript:alert(1)' } }))).toEqual([
        { path: 'author.url', message: 'Expected an https URL' },
      ]);
      expect(
        errorsOf(manifest({ author: { name: 'A', url: 'http://localhost:3000' } }))[0]?.path,
      ).toBe('author.url');
    });

    it('may link to the site itself, since the link is never loaded by Ghost', () => {
      expect(
        manifestOf(manifest({ author: { name: 'A', url: 'https://site.example.com/about/' } }))
          .author.url,
      ).toBe('https://site.example.com/about/');
    });
  });

  describe('accent colour', () => {
    it('is a six-digit hex colour, stored lowercase', () => {
      expect(manifestOf(manifest({ accent_color: '#1A2b3C' })).accent_color).toBe('#1a2b3c');
    });

    it('rejects anything else', () => {
      for (const value of [undefined, 'red', '#f50', '#ff550', '#ff5500ff', 'ff5500', 16733440]) {
        expect(errorsOf(manifest({ accent_color: value }))).toEqual([
          { path: 'accent_color', message: 'Expected a hex colour such as #ff5500' },
        ]);
      }
    });
  });

  describe('icon', () => {
    it('is one of the icons Admin ships, by name', () => {
      expect(manifestOf(manifest({ icon: { name: 'audio-lines' } })).icon).toEqual({
        name: 'audio-lines',
      });
    });

    it('or an SVG the app serves', () => {
      expect(manifestOf(manifest({ icon: { url: 'icons/app.svg' } })).icon).toEqual({
        url: 'https://podcast.example.com/icons/app.svg',
      });
    });

    it('rejects names that are not in icon-name form', () => {
      for (const name of ['AudioLines', 'audio_lines', '-audio', 'audio-', '', 'a'.repeat(65), 7]) {
        expect(errorsOf(manifest({ icon: { name } }))[0]?.path).toBe('icon.name');
      }
    });

    it('rejects an icon with both, neither, or anything else', () => {
      const expected = [{ path: 'icon', message: 'Expected an icon with either a name or a url' }];
      expect(errorsOf(manifest({ icon: { name: 'podcast', url: '/icon.svg' } }))).toEqual(expected);
      expect(errorsOf(manifest({ icon: {} }))).toEqual(expected);
      expect(errorsOf(manifest({ icon: '/icon.png' }))).toEqual(expected);
      expect(errorsOf(manifest({ icon: undefined }))).toEqual(expected);
      expect(errorsOf(manifest({ icon: { name: 'podcast', type: 'lucide' } }))[0]?.path).toBe(
        'icon',
      );
    });
  });

  describe('surfaces', () => {
    it('rejects a manifest that asks for nothing', () => {
      expect(errorsOf(manifest({ surfaces: [] }))).toEqual([
        { path: 'surfaces', message: 'Expected at least one surface' },
      ]);
      expect(errorsOf(manifest({ surfaces: undefined }))[0]?.path).toBe('surfaces');
    });

    it('rejects surfaces Ghost does not support', () => {
      expect(errorsOf(manifest({ surfaces: [{ type: 'card', url: '/card' }] }))).toEqual([
        { path: 'surfaces[0].type', message: expect.stringContaining('admin_page') },
      ]);
    });

    it('rejects a second admin page', () => {
      expect(
        errorsOf(
          manifest({
            surfaces: [
              { type: 'admin_page', url: '/admin' },
              { type: 'admin_page', url: '/other' },
            ],
          }),
        ),
      ).toEqual([{ path: 'surfaces[1]', message: 'Expected at most one admin_page surface' }]);
    });
  });

  describe('URLs', () => {
    function surfaceUrlError(url: unknown, parseOptions = options) {
      const errors = errorsOf(manifest({ surfaces: [{ type: 'admin_page', url }] }), parseOptions);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.path).toBe('surfaces[0].url');
      return errors[0]?.message;
    }

    it('rejects values that resolve to something other than https', () => {
      expect(surfaceUrlError('javascript:alert(1)')).toBe('Expected an https URL');
      expect(surfaceUrlError('data:text/html,<script>alert(1)</script>')).toBe(
        'Expected an https URL',
      );
      expect(surfaceUrlError('http://podcast.example.com/admin')).toBe('Expected an https URL');
      expect(surfaceUrlError('ftp://podcast.example.com/admin')).toBe('Expected an https URL');
    });

    it('rejects URLs carrying credentials', () => {
      // Built rather than written out, so the secret scanner does not read it as a real one.
      const withPassword = new URL('https://podcast.example.com/admin');
      withPassword.username = 'user';
      withPassword.password = 'example';
      expect(surfaceUrlError(withPassword.href)).toContain('username or password');

      const withUsername = new URL('https://podcast.example.com/admin');
      withUsername.username = 'user';
      expect(surfaceUrlError(withUsername.href)).toContain('username or password');
    });

    it('rejects values that are not usable as a URL', () => {
      expect(surfaceUrlError('')).toContain('Expected a URL');
      expect(surfaceUrlError(42)).toContain('Expected a URL');
      expect(surfaceUrlError('https://')).toContain('Expected a URL');
      expect(surfaceUrlError(`/${'a'.repeat(2000)}`)).toContain('at most 2000');
    });

    it('applies the same rules to the icon', () => {
      expect(errorsOf(manifest({ icon: { url: 'data:image/svg+xml,<svg/>' } }))).toEqual([
        { path: 'icon.url', message: 'Expected an https URL' },
      ]);
    });

    it('rejects a surface served from the site or from Admin', () => {
      expect(surfaceUrlError('https://site.example.com/content/files/app.html')).toContain(
        'Ghost itself',
      );
      expect(surfaceUrlError('https://admin.example.com/anything')).toContain('Ghost itself');
    });

    it('rejects relative URLs when the manifest itself is served from Ghost', () => {
      const errors = errorsOf(manifest(), {
        ...options,
        manifestUrl: 'https://site.example.com/content/files/ghost-app.json',
      });
      expect(errors.map((error) => error.path)).toEqual(['icon.url', 'surfaces[0].url']);
    });

    it('rejects an icon served from the site or from Admin', () => {
      expect(
        errorsOf(
          manifest({
            icon: { url: 'https://admin.example.com/ghost/api/admin/site/' },
          }),
        ),
      ).toEqual([{ path: 'icon.url', message: expect.stringContaining('Ghost itself') }]);
    });
  });

  describe('localhost', () => {
    const localUrls = [
      'http://localhost:8787/admin',
      'https://localhost:8787/admin',
      'http://app.localhost:8787/admin',
      'http://127.0.0.1:8787/admin',
      'http://[::1]:8787/admin',
      'http://localhost.:8787/admin',
      'https://127.0.0.2/admin',
      'https://127.1/admin',
      'https://0.0.0.0/admin',
      'https://[::]/admin',
      'https://[::ffff:127.0.0.1]/admin',
      'https://[::ffff:0.0.0.0]/admin',
    ];

    it('is rejected outside development, over https too', () => {
      for (const url of localUrls) {
        const errors = errorsOf(manifest({ surfaces: [{ type: 'admin_page', url }] }));
        expect(errors).toEqual([
          { path: 'surfaces[0].url', message: expect.stringContaining('development') },
        ]);
      }
    });

    it('is accepted in development', () => {
      for (const url of localUrls) {
        const parsed = manifestOf(
          manifest({ surfaces: [{ type: 'admin_page', url }] }),
          devOptions,
        );
        expect(parsed.surfaces[0]?.url).toBe(new URL(url).href);
      }
    });

    it('still requires https for other hosts in development', () => {
      expect(
        errorsOf(
          manifest({ surfaces: [{ type: 'admin_page', url: 'http://podcast.example.com/' }] }),
          devOptions,
        ),
      ).toEqual([{ path: 'surfaces[0].url', message: 'Expected an https URL' }]);
    });

    it('still rejects other schemes in development', () => {
      expect(
        errorsOf(
          manifest({ surfaces: [{ type: 'admin_page', url: 'ftp://localhost/admin' }] }),
          devOptions,
        ),
      ).toEqual([{ path: 'surfaces[0].url', message: 'Expected an http or https URL' }]);
    });

    it('still rejects a surface on the port Ghost is served from', () => {
      expect(
        errorsOf(
          manifest({ surfaces: [{ type: 'admin_page', url: 'http://localhost:2368/app' }] }),
          devOptions,
        ),
      ).toEqual([{ path: 'surfaces[0].url', message: expect.stringContaining('Ghost itself') }]);
    });
  });

  describe('the manifest URL', () => {
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
