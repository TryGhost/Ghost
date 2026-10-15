import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import {
  APP_PATH_MAX_LENGTH,
  AppPathSchema,
  PathMoveSchema,
  TITLE_MAX_LENGTH,
  TitleSchema,
  type PathMove,
} from '../../src/bridge/index.ts';

function pathError(value: unknown) {
  const result = AppPathSchema.safeParse(value);
  expect(result.success).toBe(false);
  return result.error?.issues[0]?.message;
}

describe('an app path', () => {
  it('accepts a route within the app', () => {
    for (const path of ['/', '/episodes/12', '/search?q=a%20b', '/a:b', '/tab#details']) {
      expect(AppPathSchema.parse(path)).toBe(path);
    }
  });

  it('returns the normalised form that Admin and the SDK both store', () => {
    expect(AppPathSchema.parse('/search?q=a b')).toBe('/search?q=a%20b');
    expect(AppPathSchema.parse('/x/../episodes/1')).toBe('/episodes/1');
    expect(AppPathSchema.parse('/../../settings/')).toBe('/settings/');
    expect(AppPathSchema.parse('/%2e%2e/settings?x=1#y')).toBe('/settings?x=1#y');
  });

  it('refuses anything that names a place outside the app', () => {
    for (const path of [
      '',
      'episodes',
      '//evil.example/x',
      'https://evil.example/',
      'javascript:alert(1)',
      '/\\evil.example',
      '\\\\evil.example',
      '/\t/evil.example',
      '/episodes\n12',
      '/\u0000',
    ]) {
      expect(pathError(path)).toBe('Expected a path within the app, starting with a single /');
    }
  });

  it('refuses a path that is not text', () => {
    expect(pathError(42)).toBe('Expected a path');
  });

  it('refuses a path that is too long', () => {
    expect(AppPathSchema.parse(`/${'a'.repeat(APP_PATH_MAX_LENGTH - 1)}`)).toHaveLength(
      APP_PATH_MAX_LENGTH,
    );
    expect(pathError(`/${'a'.repeat(APP_PATH_MAX_LENGTH)}`)).toBe(
      'Expected a path of at most 2048 characters',
    );
  });

  it('refuses a path that only becomes too long once normalised', () => {
    // Each space is encoded as three characters.
    const spaces = `/s?q=${' '.repeat(1000)}x`;
    expect(spaces.length).toBeLessThan(APP_PATH_MAX_LENGTH);
    expect(pathError(spaces)).toBe('Expected a path of at most 2048 characters');
  });
});

describe('a title', () => {
  it('is trimmed text', () => {
    expect(TitleSchema.parse('  Episodes  ')).toBe('Episodes');
    expect(TitleSchema.parse('')).toBe('');
  });

  it('refuses anything else, or too much of it', () => {
    expect(TitleSchema.safeParse(null).error?.issues[0]?.message).toBe('Expected a title');
    expect(TitleSchema.parse('a'.repeat(TITLE_MAX_LENGTH))).toHaveLength(TITLE_MAX_LENGTH);
    expect(TitleSchema.safeParse('a'.repeat(TITLE_MAX_LENGTH + 1)).error?.issues[0]?.message).toBe(
      'Expected a title of at most 200 characters',
    );
  });

  it('is plain text, so it cannot reorder what Admin shows after it', () => {
    for (const title of ['Episodes 🎙️', 'پادکست‌ها', '👩‍💻 Code', 'Épisodes · Saison 2']) {
      expect(TitleSchema.parse(title)).toBe(title);
    }
    for (const title of [
      '\u202Esedosipe',
      'Episodes\u2066',
      '\u200EEpisodes',
      'a\u0000b',
      'a\nb',
    ]) {
      expect(TitleSchema.safeParse(title).error?.issues[0]?.message, title).toBe(
        'Expected a title of plain text on one line',
      );
    }
  });
});

describe('a path move', () => {
  it('parses to the PathMove type, which is written out without zod', () => {
    expectTypeOf<z.output<typeof PathMoveSchema>>().toEqualTypeOf<PathMove>();
  });

  it('is push or replace', () => {
    expect(PathMoveSchema.parse('push')).toBe('push');
    expect(PathMoveSchema.parse('replace')).toBe('replace');
    for (const move of ['PUSH', 'back', true, undefined, { replace: true }]) {
      expect(PathMoveSchema.safeParse(move).error?.issues[0]?.message, String(move)).toBe(
        'Expected a move of push or replace',
      );
    }
  });
});
