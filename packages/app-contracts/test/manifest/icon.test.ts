import { describe, expect, it } from 'vitest';

import { errorsOf, manifest, manifestOf } from './helpers.ts';

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
    expect(errorsOf(manifest({ icon: { name: 'podcast', type: 'lucide' } }))[0]?.path).toBe('icon');
  });
});
