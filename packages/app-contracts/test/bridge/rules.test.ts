import { describe, expect, it } from 'vitest';

import {
  AppPathSchema,
  ConnectMessageSchema,
  FetchResponseSchema,
  StartContextSchema,
  ThemeSchema,
  isConnectMessage,
  isContainedPath,
  isFetchResponse,
  isRecord,
  isStartContext,
  isTheme,
} from '../../src/bridge/index.ts';

// The guards are what the SDK checks Admin's messages with, the schemas what Admin itself
// applies. Each case below is checked against both, so the two cannot drift apart.
function agree(
  guard: (value: unknown) => boolean,
  schema: { safeParse(value: unknown): { success: boolean } },
) {
  return (value: unknown, expected: boolean) => {
    expect(guard(value), `guard on ${JSON.stringify(value)}`).toBe(expected);
    expect(schema.safeParse(value).success, `schema on ${JSON.stringify(value)}`).toBe(expected);
  };
}

const theme = { mode: 'dark', accent_color: '#FF1A75' };

const context = {
  site: {
    url: 'https://site.example/',
    title: 'Example',
    timezone: 'Europe/Amsterdam',
    locale: 'en',
  },
  user: { id: '1', role: 'Owner' },
  theme,
  session: { revision: 3 },
  path: '/episodes/12',
};

const response = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'text/plain' },
  body: 'hi',
};

describe('a contained path', () => {
  const check = agree(isContainedPath, AppPathSchema);

  it('is a path within something', () => {
    for (const path of ['/', '/episodes/12', '/search?q=a%20b', '/a:b', '/tab#details']) {
      check(path, true);
    }
  });

  it('is never a way out of it', () => {
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
      42,
      null,
      undefined,
    ]) {
      check(path, false);
    }
  });
});

describe('a record', () => {
  it('is anything whose fields can be read', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(true);
    for (const value of [null, undefined, 'a', 1, true]) {
      expect(isRecord(value)).toBe(false);
    }
  });
});

describe('a theme', () => {
  const check = agree(isTheme, ThemeSchema);

  it('is light or dark, with an accent colour', () => {
    check(theme, true);
    check({ mode: 'light', accent_color: '#ff5500' }, true);
    check({ ...theme, somethingNew: true }, true);
  });

  it('is never system, nor missing a field', () => {
    for (const value of [
      { mode: 'system', accent_color: '#ff5500' },
      { mode: 'dark' },
      { accent_color: '#ff5500' },
      { mode: 'dark', accent_color: 1 },
      null,
      'dark',
    ]) {
      check(value, false);
    }
  });
});

describe('a start context', () => {
  const check = agree(isStartContext, StartContextSchema);

  it('is what Admin sends, whatever a newer Admin adds', () => {
    check(context, true);
    check({ ...context, user: { ...context.user, email: 'person@example.com' }, extra: 1 }, true);
    check({ ...context, session: { revision: 0 } }, true);
  });

  it('is never missing what the SDK relies on', () => {
    for (const value of [
      null,
      { ...context, site: undefined },
      { ...context, site: { ...context.site, locale: undefined } },
      { ...context, user: { id: '1' } },
      { ...context, theme: { mode: 'system', accent_color: '#ff5500' } },
      { ...context, session: undefined },
      { ...context, session: { revision: -1 } },
      { ...context, session: { revision: 1.5 } },
      { ...context, session: { revision: '3' } },
      { ...context, path: 'episodes' },
      { ...context, path: '//evil.example' },
    ]) {
      check(value, false);
    }
  });
});

describe('a connect message', () => {
  const check = agree(isConnectMessage, ConnectMessageSchema);

  it('is the connect type, whatever else it carries', () => {
    check({ type: 'ghost-app:connect' }, true);
    check({ type: 'ghost-app:connect', extra: true }, true);
  });

  it('is nothing else', () => {
    for (const value of [null, 'ghost-app:connect', {}, { type: 'ghost-app:hello', sdk: '1' }]) {
      check(value, false);
    }
  });
});

describe('a fetch response', () => {
  const check = agree(isFetchResponse, FetchResponseSchema);

  it('carries a status a Response can be built with', () => {
    check(response, true);
    check({ ...response, status: 204, headers: {}, body: '' }, true);
    check({ ...response, status: 599 }, true);
  });

  it('is nothing else', () => {
    for (const value of [
      null,
      { ...response, status: 0 },
      { ...response, status: 101 },
      { ...response, status: 199 },
      { ...response, status: 600 },
      { ...response, status: 200.5 },
      { ...response, status: '200' },
      { ...response, statusText: undefined },
      { ...response, headers: null },
      { ...response, headers: { 'content-length': 2 } },
      { ...response, body: null },
    ]) {
      check(value, false);
    }
  });
});
