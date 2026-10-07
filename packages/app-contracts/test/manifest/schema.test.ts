import { describe, expect, it } from 'vitest';

import { errorsOf, manifest, manifestOf } from './helpers.ts';

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
