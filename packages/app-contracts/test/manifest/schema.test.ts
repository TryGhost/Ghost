import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppManifestSchema } from '../../src/manifest/index.ts';
import { devManifest, devOptions, errorsOf, manifest, manifestOf } from './helpers.ts';

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
      errorsOf(
        manifest({
          surfaces: [
            { type: 'admin_page', url: 'https://podcast.example.com/admin', label: 'Podcast' },
          ],
        }),
      ),
    ).toEqual([{ path: 'surfaces[0]', message: expect.stringContaining('label') }]);
  });

  it('reports every problem, each with its path', () => {
    const errors = errorsOf({ id: 'Podcast', name: '', surfaces: [] });
    expect(errors.map((error) => error.path).sort()).toEqual([
      'accent_color',
      'author',
      'backend_key',
      'description',
      'development',
      'icon',
      'id',
      'identity_key',
      'manifest_url',
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
    expect(errorsOf(manifest({ name: '\u0301\ufe0f' }))).toEqual([
      { path: 'name', message: 'Expected text' },
    ]);
    expect(errorsOf(manifest({ name: 'a'.repeat(51) }))[0]?.path).toBe('name');
  });

  it('rejects a name or description that could read as something else', () => {
    for (const value of [
      'Pod\ncast',
      'Pod\u2028cast',
      'Pod\u2029cast',
      'Pod\u202ecast',
      'Pod\u0000cast',
      'Pod\u2066cast',
      'Pod\u200bcast',
      'Pod\u00adcast',
      'Pod\ue000',
    ]) {
      expect(errorsOf(manifest({ name: value }))).toEqual([
        { path: 'name', message: 'Expected plain text on one line' },
      ]);
      expect(errorsOf(manifest({ description: value }))).toEqual([
        { path: 'description', message: 'Expected plain text on one line' },
      ]);
    }
    for (const value of ['Pödcast 🎙️', '播客', 'नमस्ते', 'می‌خواهم', '👨‍👩‍👧 🇳🇱']) {
      expect(manifestOf(manifest({ name: value })).name).toBe(value);
    }
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
      manifestOf(manifest({ author: { name: 'A', url: 'https://site.example.com/about/' } })).author
        .url,
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

describe('development', () => {
  it('says whether the app is a development build', () => {
    expect(manifestOf(manifest({ development: true })).development).toBe(true);
    expect(manifestOf(manifest({ development: false })).development).toBe(false);
  });

  it('is required, and only true or false', () => {
    for (const value of [undefined, 'true', 1, null]) {
      expect(errorsOf(manifest({ development: value }))).toEqual([
        { path: 'development', message: 'Expected true or false' },
      ]);
    }
  });
});

describe('manifest_url', () => {
  it.each(['#install', '#'])('refuses a fragment, even an empty one: %s', (fragment) => {
    expect(
      errorsOf(manifest({ manifest_url: `https://podcast.example.com/ghost-app.json${fragment}` })),
    ).toEqual([{ path: 'manifest_url', message: 'Expected a URL without a fragment' }]);
  });

  it('is held to by AppManifestSchema too', () => {
    const parsed = manifestOf(manifest());
    const result = AppManifestSchema.safeParse({
      ...parsed,
      manifest_url: `${parsed.manifest_url}#`,
    });
    expect(result.error?.issues).toMatchObject([
      { path: ['manifest_url'], message: 'Expected a URL without a fragment' },
    ]);
  });

  it('leaves fragments in other URLs alone', () => {
    const url = 'https://podcast.example.com/admin#/episodes';
    expect(manifestOf(manifest({ surfaces: [{ type: 'admin_page', url }] })).surfaces[0]?.url).toBe(
      url,
    );
  });
});

describe('development on localhost', () => {
  const ON_LOCALHOST = 'Expected true, as the app is on localhost';

  it.each([
    { author: { name: 'Example Audio', url: 'http://localhost:8787/about' } },
    { icon: { url: 'http://localhost:8787/icon.svg' } },
    { surfaces: [{ type: 'admin_page', url: 'http://localhost:8787/admin' }] },
    { manifest_url: 'http://localhost:8787/ghost-app.json' },
  ])('is required when a URL is on localhost: %o', (overrides) => {
    const input = manifest(overrides);
    const parseOptions = { ...devOptions, manifestUrl: input.manifest_url };

    expect(errorsOf(input, parseOptions)).toEqual([{ path: 'development', message: ON_LOCALHOST }]);
  });

  it('accepts an app on localhost that says it’s a development build', () => {
    expect(manifestOf(devManifest(), devOptions).development).toBe(true);
  });

  // It's a label: a production site may run a development build to test it.
  it('lets an app off localhost say it’s a development build', () => {
    expect(manifestOf(manifest({ development: true })).development).toBe(true);
  });

  it('isn’t reported over a URL that is already wrong', () => {
    expect(
      errorsOf(
        devManifest({
          surfaces: [{ type: 'admin_page', url: 'ftp://localhost/admin' }],
          development: false,
        }),
        devOptions,
      ).map(({ path }) => path),
    ).toEqual(['surfaces[0].url']);
  });

  it('is held to by AppManifestSchema too', () => {
    const parsed = manifestOf(devManifest(), devOptions);
    const result = AppManifestSchema.safeParse({ ...parsed, development: false });
    expect(result.error?.issues).toMatchObject([{ path: ['development'], message: ON_LOCALHOST }]);
  });
});

describe('AppManifestSchema', () => {
  it('accepts what parseManifest hands back, wherever Ghost is served from now', () => {
    const parsed = manifestOf(manifest());
    expect(AppManifestSchema.parse(parsed)).toEqual(parsed);
    expect(
      AppManifestSchema.parse(manifestOf(manifest({ icon: { name: 'audio-lines' } }))),
    ).toEqual(manifestOf(manifest({ icon: { name: 'audio-lines' } })));
  });

  it('encodes a manifest back to the same shape it reads', () => {
    const parsed = manifestOf(manifest());
    expect(z.encode(AppManifestSchema, parsed)).toEqual(parsed);
    expect(JSON.stringify(z.encode(AppManifestSchema, parsed))).toBe(JSON.stringify(parsed));
  });

  it('only accepts absolute URLs', () => {
    const result = AppManifestSchema.safeParse(
      manifest({ icon: { url: '/icon.svg' }, surfaces: [{ type: 'admin_page', url: '/admin' }] }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'icon.url',
      'surfaces.0.url',
    ]);
  });

  it('still rejects what parseManifest rejects, other than the URL rules', () => {
    const parsed = manifestOf(manifest());
    expect(AppManifestSchema.safeParse({ ...parsed, id: 'Podcast' }).success).toBe(false);
    expect(AppManifestSchema.safeParse({ ...parsed, icon: {} }).success).toBe(false);
    expect(AppManifestSchema.safeParse({ ...parsed, extra: true }).success).toBe(false);
  });
});
