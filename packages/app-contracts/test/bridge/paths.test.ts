import { describe, expect, it } from 'vitest';

import {
  APP_PATH_MAX_LENGTH,
  AppPathSchema,
  PathChangeOptionsSchema,
  TITLE_MAX_LENGTH,
  TitleSchema,
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
});

describe('path change options', () => {
  it('accepts replace, or nothing', () => {
    expect(PathChangeOptionsSchema.parse({})).toEqual({});
    expect(PathChangeOptionsSchema.parse({ replace: true })).toEqual({ replace: true });
  });

  it('refuses options it does not know', () => {
    expect(PathChangeOptionsSchema.safeParse({ replace: 'yes' }).success).toBe(false);
    expect(PathChangeOptionsSchema.safeParse({ reload: true }).success).toBe(false);
    expect(PathChangeOptionsSchema.safeParse(null).error?.issues[0]?.message).toBe(
      'Expected options such as { replace: true }',
    );
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
});
