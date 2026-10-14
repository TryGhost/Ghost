import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  APP_ERROR_CODES,
  ARGUMENT_MESSAGES,
  AppPathSchema,
  BRIDGE_ERROR_CODES,
  HOST_ERROR_CODES,
  type AppErrorCode,
  type HostErrorCode,
  decodeBridgeError,
  encodeBridgeError,
  isConnectMessage,
  isContainedPath,
  isFetchResponse,
  isRecord,
  isMultipartContentType,
  isReservedRequestHeader,
  isStartContext,
  isTheme,
  methodAllowsBody,
  normaliseAppPath,
} from '../../src/bridge/index.ts';

function holds(guard: (value: unknown) => boolean) {
  return (value: unknown, expected: boolean) => {
    expect(guard(value), JSON.stringify(value)).toBe(expected);
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
  // The SDK checks an app path with the guard and Admin with the schema built on it, so
  // both are held to every case.
  const check = (value: unknown, expected: boolean) => {
    holds(isContainedPath)(value, expected);
    expect(AppPathSchema.safeParse(value).success, JSON.stringify(value)).toBe(expected);
  };

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

describe('a normalised app path', () => {
  it('is spelled as the URL parser spells it, so the same route compares equal', () => {
    expect(normaliseAppPath('/episodes/a b')).toBe('/episodes/a%20b');
    expect(normaliseAppPath('/episodes/a%20b')).toBe('/episodes/a%20b');
    expect(normaliseAppPath('/search?q=a b#notes 2')).toBe('/search?q=a%20b#notes%202');
    expect(normaliseAppPath('/')).toBe('/');
  });

  it('resolves `.` and `..` within the app, so it can never climb out', () => {
    expect(normaliseAppPath('/x/../episodes/1')).toBe('/episodes/1');
    expect(normaliseAppPath('/../../settings')).toBe('/settings');
    expect(normaliseAppPath('/%2e%2e/settings?x=1#y')).toBe('/settings?x=1#y');
    expect(normaliseAppPath('/./a/.')).toBe('/a/');
  });

  it('stays as it is once normalised', () => {
    for (const path of ['/episodes/a b', '/../x', '/search?q=ü#é', '/a:b', '/?', '/#']) {
      const once = normaliseAppPath(path);
      expect(normaliseAppPath(once), path).toBe(once);
      expect(isContainedPath(once), path).toBe(true);
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
  const check = holds(isTheme);

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
  const check = holds(isStartContext);

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
  const check = holds(isConnectMessage);

  it("is the connect type with the names of Admin's exports, whatever else it carries", () => {
    check({ type: 'ghost-app:connect', exports: ['fetch', 'open'] }, true);
    check({ type: 'ghost-app:connect', exports: [] }, true);
    check({ type: 'ghost-app:connect', exports: ['fetch'], extra: true }, true);
  });

  it('is nothing else', () => {
    for (const value of [
      null,
      'ghost-app:connect',
      {},
      { type: 'ghost-app:hello', sdk: '1' },
      { type: 'ghost-app:connect' },
      { type: 'ghost-app:connect', exports: 'fetch' },
      { type: 'ghost-app:connect', exports: ['fetch', 1] },
    ]) {
      check(value, false);
    }
  });
});

describe('a fetch response', () => {
  const check = holds(isFetchResponse);

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

describe('a refusal', () => {
  it('crosses the channel as its code and detail', () => {
    expect(encodeBridgeError('blocked', "Apps can't use /db/")).toBe(
      "blocked: Apps can't use /db/",
    );
    for (const code of BRIDGE_ERROR_CODES) {
      expect(
        decodeBridgeError(encodeBridgeError(code, 'Why: because\nso'), BRIDGE_ERROR_CODES),
      ).toEqual({ code, detail: 'Why: because\nso' });
    }
  });

  it('keeps the codes stable, as the SDK and older Admins read them', () => {
    expect(HOST_ERROR_CODES).toEqual([
      'session_ended',
      'invalid_argument',
      'invalid_path',
      'blocked',
      'network_error',
      'rejected',
    ]);
    expect(APP_ERROR_CODES).toEqual(['invalid_context', 'invalid_argument']);
    expect(BRIDGE_ERROR_CODES).toEqual([...HOST_ERROR_CODES, 'invalid_context']);
    expect(new Set(BRIDGE_ERROR_CODES)).toEqual(new Set([...HOST_ERROR_CODES, ...APP_ERROR_CODES]));
  });

  it('is read only with a code the other side may send', () => {
    const fromAdmin = (message: string) => decodeBridgeError(message, HOST_ERROR_CODES);
    expect(fromAdmin('blocked: No')).toEqual({ code: 'blocked', detail: 'No' });
    // Only the page refuses with it, so from Admin it is no code at all.
    expect(fromAdmin('invalid_context: Odd')).toBeUndefined();
    expectTypeOf(fromAdmin).returns.toEqualTypeOf<
      { code: HostErrorCode; detail: string } | undefined
    >();
    expectTypeOf<'invalid_context'>().not.toExtend<HostErrorCode>();

    const fromPage = (message: string) => decodeBridgeError(message, APP_ERROR_CODES);
    expect(fromPage('invalid_argument: Odd')).toEqual({ code: 'invalid_argument', detail: 'Odd' });
    expect(fromPage('blocked: No')).toBeUndefined();
    expectTypeOf(fromPage).returns.toEqualTypeOf<
      { code: AppErrorCode; detail: string } | undefined
    >();
  });

  it('is not read from a message without a known code', () => {
    for (const message of [
      '',
      'Unknown place',
      'not_framed: Odd',
      'blocked:no space',
      ' blocked: leading space',
      'Blocked: capitals',
    ]) {
      expect(decodeBridgeError(message, BRIDGE_ERROR_CODES), message).toBeUndefined();
    }
  });
});

describe('a body', () => {
  it('goes with every method but GET and HEAD', () => {
    expect(['POST', 'PUT', 'PATCH', 'DELETE'].every(methodAllowsBody)).toBe(true);
    expect(['GET', 'HEAD'].some(methodAllowsBody)).toBe(false);
  });
});

describe('the messages for a refused argument', () => {
  it('name what was expected, with the methods spelled out', () => {
    expect(ARGUMENT_MESSAGES.fetchMethod).toBe(
      'Expected a method of: GET, POST, PUT, DELETE, PATCH, HEAD',
    );
    // In lowercase, whatever the case it was given in, as the SDK only ever has it that way.
    for (const name of ['cookie', 'Cookie', 'COOKIE']) {
      expect(ARGUMENT_MESSAGES.reservedHeader(name)).toBe(
        'Expected no cookie header, which only Admin sets',
      );
    }
    for (const message of Object.values(ARGUMENT_MESSAGES)) {
      expect(typeof message === 'string' ? message : message('x')).toMatch(/^Expected /);
    }
  });
});

describe('a multipart content type', () => {
  it('is any multipart type, in any case', () => {
    for (const value of [
      'multipart/form-data; boundary=x',
      'Multipart/Mixed',
      ' multipart/related',
      'MULTIPART/FORM-DATA',
    ]) {
      expect(isMultipartContentType(value), value).toBe(true);
    }
  });

  it('is no other', () => {
    for (const value of [
      'application/json',
      'text/plain; x=multipart/form-data',
      'multipart',
      '',
    ]) {
      expect(isMultipartContentType(value), value).toBe(false);
    }
  });
});

describe('a reserved request header', () => {
  it('is one only Admin sets, in any case', () => {
    for (const name of [
      'cookie',
      'COOKIE',
      'Authorization',
      'x-ghost-anything',
      'x-forwarded-host',
    ]) {
      expect(isReservedRequestHeader(name), name).toBe(true);
    }
  });

  it('is no other', () => {
    for (const name of ['content-type', 'accept', 'x-ghost', 'x-ghostly', 'cookies', 'hosts']) {
      expect(isReservedRequestHeader(name), name).toBe(false);
    }
  });
});
