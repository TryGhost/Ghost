import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppManifestSchema } from '../../src/manifest/index.ts';
import { URL_MAX_LENGTH } from '../../src/manifest/limits.ts';
import { devManifest, devOptions, errorsOf, manifest, manifestOf, storedOf } from './helpers.ts';

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
          surfaces: [{ type: 'admin_page', url: '/admin', label: 'Podcast' }],
        }),
      ),
    ).toEqual([{ path: 'surfaces[0]', message: expect.stringContaining('label') }]);
  });

  it('reports every problem, each with its path', () => {
    const errors = errorsOf({ id: 'Podcast', name: '', surfaces: [] });
    expect(errors.map((error) => error.path).sort()).toEqual([
      'accent_color',
      'access',
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

  it('rejects text that shows nothing, such as Hangul fillers or zero-width joiners', () => {
    for (const value of [
      '\u3164',
      '\u115f\u1160',
      '\uffa0 \u3164',
      '\u2800\u2800',
      '\u200d\u200c',
      '\u3000\u3164\u00a0',
      '\u3164\u0301',
    ]) {
      expect(errorsOf(manifest({ name: value })), JSON.stringify(value)).toEqual([
        { path: 'name', message: 'Expected text' },
      ]);
      expect(errorsOf(manifest({ description: value }))).toEqual([
        { path: 'description', message: 'Expected text' },
      ]);
      expect(errorsOf(manifest({ author: { name: value, url: 'https://example.com' } }))).toEqual([
        { path: 'author.name', message: 'Expected text' },
      ]);
    }
  });

  it('takes what shows nothing off the ends, and leaves it between words and in emoji', () => {
    expect(manifestOf(manifest({ name: '\u3164Podcast\u2800 \uffa0\u200d' })).name).toBe('Podcast');
    expect(
      manifestOf(manifest({ author: { name: '\u115fExample\u3164', url: 'https://example.com' } }))
        .author.name,
    ).toBe('Example');
    expect(manifestOf(manifest({ name: 'Pod\u3164cast' })).name).toBe('Pod\u3164cast');
    expect(manifestOf(manifest({ name: 'Podcast ❤️' })).name).toBe('Podcast ❤️');
    expect(manifestOf(manifest({ name: '👨‍👩‍👧' })).name).toBe('👨‍👩‍👧');
    expect(manifestOf(manifest({ name: ' \u{1f3fb}Podcast' })).name).toBe('\u{1f3fb}Podcast');
    // A mark goes with the blank it sits on, or at the start, on nothing.
    for (const name of [
      '\nPodcast\t',
      '\u0301Podcast \ufe0f',
      '\u3164\u0301Podcast',
      '\u2800\ufe0f\u2800\ufe0f\u3164Podcast',
      'Podcast\u3164\u034f\u3164\u034f',
      'Podcast\u2800\u0301',
    ]) {
      expect(manifestOf(manifest({ name })).name, JSON.stringify(name)).toBe('Podcast');
    }
  });

  // A pattern anchored at the end would take minutes on the run between words, so a trim that
  // isn't linear fails on the test's timeout rather than on a measured time.
  it('takes a long run of blanks off the ends, or leaves one between words', () => {
    for (const blank of [' ', '\u3164', '\u2800\ufe0f']) {
      const blanks = blank.repeat(60_000);
      expect(manifestOf(manifest({ name: `${blanks}a${blanks}` })).name).toBe('a');
      expect(errorsOf(manifest({ name: `a${blanks}a` }))[0]?.path).toBe('name');
    }
  });

  it('refuses what plain text refuses at the ends rather than taking it off', () => {
    const scotland = '\u{1f3f4}\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}';
    expect(errorsOf(manifest({ name: `Podcast ${scotland}` }))).toEqual([
      { path: 'name', message: 'Expected plain text on one line' },
    ]);
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

  it('may be a mailto: link to one address, which reads back as it was accepted', () => {
    const accepted = manifestOf(
      manifest({ author: { name: 'A', url: 'MAILTO:support@example.com' } }),
    );
    expect(accepted.author.url).toBe('mailto:support@example.com');
    expect(AppManifestSchema.parse(storedOf(accepted)).author.url).toBe(
      'mailto:support@example.com',
    );
    expect(
      manifestOf(manifest({ author: { name: 'A', url: ' mailto:support@example.com' } })).author
        .url,
    ).toBe('mailto:support@example.com');
    expect(
      manifestOf(manifest({ author: { name: 'A', url: 'mailto:josé+apps@example.co.uk' } })).author
        .url,
    ).toBe('mailto:jos%C3%A9+apps@example.co.uk');

    for (const url of [
      'mailto:',
      'mailto:support',
      'mailto:support@example.com,other@example.com',
      'mailto:support@example.com?subject=Hi',
      'mailto:support@example.com?cc=other@example.com',
      'mailto:support@example.com#x',
      'mailto:support@example.com?',
      'mailto:support@example.com#',
      'mailto:a%40example.com%2Cb@example.com',
      'mailto:support@example.com%3Fsubject%3DHi',
      'mailto:%20support@example.com',
      'mailto:support%ZZ@example.com',
      'mailto://first@example.com,/second@example.com',
      'mailto://first@example.com%2C/second@example.com',
      'mailto://support@example.com',
      'mailto:support@example.com%00',
      'mailto:sup%01port@example.com',
      'mailto:support@example.com%E2%80%AE',
      'mailto:support@example.com%E1%85%9F',
      'mailto:sup%E2%A0%80port@example.com',
      `mailto:${'a'.repeat(URL_MAX_LENGTH)}@example.com`,
    ]) {
      expect(errorsOf(manifest({ author: { name: 'A', url } }))).toEqual([
        { path: 'author.url', message: 'Expected a mailto: link to one email address' },
      ]);
    }
  });

  it('keeps mailto: to the author, never the manifest URL', () => {
    expect(
      errorsOf(manifest({ manifest_url: 'mailto:support@example.com' })).some(
        ({ path }) => path === 'manifest_url',
      ),
    ).toBe(true);
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
      ...storedOf(parsed),
      manifest_url: `${parsed.manifest_url}#`,
    });
    expect(result.error?.issues).toMatchObject([
      { path: ['manifest_url'], message: 'Expected a URL without a fragment' },
    ]);
  });

  it('leaves fragments in other URLs alone', () => {
    const url = '/admin#/episodes';
    expect(manifestOf(manifest({ surfaces: [{ type: 'admin_page', url }] })).surfaces[0]?.url).toBe(
      `https://podcast.example.com${url}`,
    );
  });
});

describe('development on localhost', () => {
  const ON_LOCALHOST = 'Expected true, as the app is on localhost';

  it.each([
    { author: { name: 'Example Audio', url: 'http://localhost:8787/about' } },
    { manifest_url: 'http://127.0.0.1:8787/ghost-app.json' },
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
    const result = AppManifestSchema.safeParse({ ...storedOf(parsed), development: false });
    expect(result.error?.issues).toMatchObject([{ path: ['development'], message: ON_LOCALHOST }]);
  });
});

describe('AppManifestSchema', () => {
  it('accepts what parseManifest hands back, wherever Ghost is served from now', () => {
    const parsed = manifestOf(manifest());
    expect(AppManifestSchema.parse(storedOf(parsed))).toEqual(parsed);
    const named = manifestOf(manifest({ icon: { name: 'audio-lines' } }));
    expect(AppManifestSchema.parse(storedOf(named))).toEqual(named);
  });

  it('encodes a manifest back to the shape it reads, which reads as the same manifest', () => {
    const parsed = manifestOf(manifest());
    expect(z.encode(AppManifestSchema, parsed)).toEqual({ ...parsed, access: {} });
    expect(AppManifestSchema.parse(JSON.parse(JSON.stringify(storedOf(parsed))))).toEqual(parsed);
  });

  it('reads back text stored before blank text was refused', () => {
    // Otherwise one such row would fail every read of the installations, uninstall included.
    const parsed = manifestOf(manifest());
    for (const stored of [
      { ...parsed, name: '\u3164' },
      { ...parsed, description: '\u3164' },
      { ...parsed, author: { ...parsed.author, name: '\u3164' } },
    ]) {
      expect(AppManifestSchema.parse(storedOf(stored))).toEqual(stored);
    }
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
    const stored = storedOf(parsed);
    expect(AppManifestSchema.safeParse({ ...stored, id: 'Podcast' }).success).toBe(false);
    expect(AppManifestSchema.safeParse({ ...stored, icon: {} }).success).toBe(false);
    expect(AppManifestSchema.safeParse({ ...stored, extra: true }).success).toBe(false);
  });
});

describe('access', () => {
  const withAccess = (access: unknown) => manifest({ access });

  it('is required, and may ask for nothing', () => {
    expect(errorsOf(manifest({ access: undefined }))[0]?.path).toBe('access');
    expect(manifestOf(withAccess({})).access).toEqual([]);
  });

  it('reads grouped scopes into one list in the registry’s order, backend off unless turned on', () => {
    expect(
      manifestOf(
        withAccess({
          slug: { scopes: [{ permission_key: 'slug:generate' }] },
          post: {
            scopes: [
              { permission_key: 'post:edit' },
              { permission_key: 'post:read', backend: true },
            ],
          },
        }),
      ).access,
    ).toEqual([
      { permission_key: 'post:read', backend: true },
      { permission_key: 'post:edit', backend: false },
      { permission_key: 'slug:generate', backend: false },
    ]);
  });

  it('refuses a resource Ghost doesn’t know', () => {
    expect(errorsOf(withAccess({ member: { scopes: [{ permission_key: 'post:read' }] } }))).toEqual(
      [
        {
          path: 'access',
          message: 'Expected resources Ghost knows, such as post, not member',
        },
      ],
    );
  });

  it('refuses a __proto__ resource rather than dropping it', () => {
    const access = JSON.parse('{"__proto__": {"scopes": [{"permission_key": "post:read"}]}}');
    expect(errorsOf(withAccess(access))).toEqual([
      {
        path: 'access',
        message: 'Expected resources Ghost knows, such as post, not __proto__',
      },
    ]);
  });

  it('refuses a scope Ghost doesn’t know, and wildcards', () => {
    expect(
      errorsOf(withAccess({ post: { scopes: [{ permission_key: 'post:publish' }] } })),
    ).toEqual([
      {
        path: 'access.post.scopes[0].permission_key',
        message: expect.stringContaining('permission key Ghost knows'),
      },
    ]);
    for (const name of ['post:*', '*']) {
      expect(errorsOf(withAccess({ post: { scopes: [{ permission_key: name }] } }))).toEqual([
        {
          path: 'access.post.scopes[0].permission_key',
          message: expect.stringContaining('wildcards'),
        },
      ]);
    }
  });

  it('refuses a scope listed under another resource', () => {
    expect(
      errorsOf(withAccess({ post: { scopes: [{ permission_key: 'slug:generate' }] } })),
    ).toEqual([
      {
        path: 'access.post.scopes[0].permission_key',
        message: expect.stringContaining('post scope'),
      },
    ]);
  });

  it('reports a scope under the wrong resource or listed twice with every other problem', () => {
    expect(
      errorsOf(
        withAccess({
          post: {
            scopes: [
              { permission_key: 'tag:edit' },
              { permission_key: 'post:publish' },
              { permission_key: 'post:read' },
            ],
          },
          tag: { scopes: [{ permission_key: 'tag:read' }, { permission_key: 'tag:read' }] },
        }),
      ).map(({ path }) => path),
    ).toEqual([
      'access.post.scopes[1].permission_key',
      'access.post.scopes[0].permission_key',
      'access.tag.scopes[1].permission_key',
    ]);
  });

  it('refuses a scope listed twice', () => {
    expect(
      errorsOf(
        withAccess({
          post: {
            scopes: [
              { permission_key: 'post:read' },
              { permission_key: 'post:read', backend: true },
            ],
          },
        }),
      ),
    ).toEqual([
      {
        path: 'access.post.scopes[1].permission_key',
        message: 'Expected post:read only once',
      },
    ]);
  });

  it('refuses a resource with no scopes, and scopes that aren’t objects', () => {
    expect(errorsOf(withAccess({ post: { scopes: [] } }))[0]?.path).toBe('access.post.scopes');
    expect(errorsOf(withAccess({ post: { scopes: ['post:read'] } }))[0]?.path).toBe(
      'access.post.scopes[0]',
    );
    expect(errorsOf(withAccess({ post: ['post:read'] }))[0]?.path).toBe('access.post');
    expect(errorsOf(withAccess([]))[0]?.path).toBe('access');
  });

  it('refuses a backend flag that isn’t true or false', () => {
    expect(
      errorsOf(
        withAccess({
          post: { scopes: [{ permission_key: 'post:read', backend: 'yes' }] },
        }),
      )[0]?.path,
    ).toBe('access.post.scopes[0].backend');
  });

  // Room is left for both, but neither does anything yet.
  it('refuses a reason on a resource and an optional flag on a scope', () => {
    expect(
      errorsOf(
        withAccess({
          post: { scopes: [{ permission_key: 'post:read' }], reason: 'To list posts.' },
        }),
      ),
    ).toEqual([{ path: 'access.post', message: expect.stringContaining('reason') }]);
    expect(
      errorsOf(
        withAccess({
          post: { scopes: [{ permission_key: 'post:read', optional: true }] },
        }),
      ),
    ).toEqual([
      {
        path: 'access.post.scopes[0]',
        message: expect.stringContaining('optional'),
      },
    ]);
  });

  it('is read back by AppManifestSchema as it was parsed', () => {
    const parsed = manifestOf(
      withAccess({
        tag: {
          scopes: [{ permission_key: 'tag:browse' }, { permission_key: 'tag:edit', backend: true }],
        },
      }),
    );
    expect(AppManifestSchema.parse(storedOf(parsed))).toEqual(parsed);
    // Stored in the developer's grouped form, every scope with its backend flag.
    expect(storedOf(parsed).access).toEqual({
      tag: {
        scopes: [
          { permission_key: 'tag:browse', backend: false },
          { permission_key: 'tag:edit', backend: true },
        ],
      },
    });
  });

  it('stores the same access the same way, however it was written', () => {
    const one = manifestOf(
      withAccess({
        tag: {
          scopes: [{ permission_key: 'tag:edit', backend: true }, { permission_key: 'tag:browse' }],
        },
        post: { scopes: [{ permission_key: 'post:read' }] },
      }),
    );
    const other = manifestOf(
      withAccess({
        post: { scopes: [{ permission_key: 'post:read', backend: false }] },
        tag: {
          scopes: [{ permission_key: 'tag:browse' }, { permission_key: 'tag:edit', backend: true }],
        },
      }),
    );
    expect(JSON.stringify(storedOf(one))).toBe(JSON.stringify(storedOf(other)));
    // A list in any order is written back in the registry's.
    const reversed = { ...one, access: [...one.access].reverse() };
    expect(JSON.stringify(storedOf(reversed))).toBe(JSON.stringify(storedOf(one)));
    expect(Object.keys(storedOf(one).access)).toEqual(['post', 'tag']);
  });
});
