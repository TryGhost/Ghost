import { describe, expect, it } from 'vitest';

import {
  FETCH_BODY_MAX_BYTES,
  FETCH_PATH_MAX_LENGTH,
  FetchRequestSchema,
  FetchResponseSchema,
} from '../../src/bridge/index.ts';

function requestErrors(request: unknown) {
  const result = FetchRequestSchema.safeParse(request);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => ({ path: issue.path, message: issue.message }));
}

describe('a fetch request', () => {
  it('needs only a path', () => {
    expect(FetchRequestSchema.parse({ path: '/posts/?limit=5' })).toEqual({
      path: '/posts/?limit=5',
    });
  });

  it('takes a method, headers and a text body', () => {
    const request = {
      path: '/posts/',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'abc' },
      body: JSON.stringify({ posts: [{ title: 'Hello' }] }),
    };
    expect(FetchRequestSchema.parse(request)).toEqual(request);
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD']) {
      expect(FetchRequestSchema.parse({ path: '/posts/', method }).method).toBe(method);
    }
  });

  it('refuses a URL in place of a path', () => {
    for (const path of [
      'https://evil.example/ghost/api/admin/posts/',
      '//evil.example/posts/',
      'posts/',
      '/\\evil.example/',
      '',
    ]) {
      expect(requestErrors({ path })).toEqual([
        { path: ['path'], message: 'Expected an Admin API path such as /posts/, not a URL' },
      ]);
    }
    expect(requestErrors({ path: 42 })).toEqual([
      { path: ['path'], message: 'Expected an Admin API path such as /posts/' },
    ]);
  });

  it('refuses a path that is too long', () => {
    expect(requestErrors({ path: `/${'a'.repeat(FETCH_PATH_MAX_LENGTH)}` })).toEqual([
      { path: ['path'], message: 'Expected an Admin API path of at most 2048 characters' },
    ]);
  });

  it('refuses methods the Admin API does not answer', () => {
    for (const method of ['get', 'OPTIONS', 'TRACE', 'CONNECT', 1]) {
      expect(requestErrors({ path: '/posts/', method })).toEqual([
        { path: ['method'], message: 'Expected a method of: GET, POST, PUT, DELETE, PATCH, HEAD' },
      ]);
    }
  });

  it('refuses headers the browser could not send', () => {
    expect(requestErrors({ path: '/posts/', headers: { 'Bad Name': 'x', 'X-Ok': 'y' } })).toEqual([
      {
        path: ['headers', 'Bad Name'],
        message: 'Expected header names made of letters, digits and -',
      },
    ]);
    expect(requestErrors({ path: '/posts/', headers: { 'X-Test': 'a\r\nCookie: b' } })).toEqual([
      { path: ['headers', 'X-Test'], message: 'Expected header values on one line' },
    ]);
    expect(requestErrors({ path: '/posts/', headers: { 'X-Test': 1 } })).toEqual([
      { path: ['headers', 'X-Test'], message: 'Expected header values to be text' },
    ]);
    expect(requestErrors({ path: '/posts/', headers: { 'X-Test': 'a'.repeat(8193) } })).toEqual([
      { path: ['headers', 'X-Test'], message: 'Expected header values of at most 8192 characters' },
    ]);
    expect(requestErrors({ path: '/posts/', headers: [['X-Test', 'a']] })).toEqual([
      { path: ['headers'], message: 'Expected headers as an object of names to values' },
    ]);
  });

  it('refuses too many headers', () => {
    const headers = Object.fromEntries(
      Array.from({ length: 51 }, (_, index) => [`X-Test-${index}`, 'a']),
    );
    expect(requestErrors({ path: '/posts/', headers })).toEqual([
      { path: ['headers'], message: 'Expected at most 50 headers' },
    ]);
    delete headers['X-Test-0'];
    expect(FetchRequestSchema.safeParse({ path: '/posts/', headers }).success).toBe(true);
  });

  it('refuses a body on a GET or HEAD request', () => {
    for (const method of [undefined, 'GET', 'HEAD']) {
      expect(requestErrors({ path: '/posts/', method, body: '' })).toEqual([
        { path: ['body'], message: 'Expected no body on a GET or HEAD request' },
      ]);
    }
  });

  it('measures the body in bytes', () => {
    const ascii = 'a'.repeat(FETCH_BODY_MAX_BYTES);
    expect(
      FetchRequestSchema.safeParse({ path: '/db/', method: 'POST', body: ascii }).success,
    ).toBe(true);
    const tooLong = { path: '/posts/', method: 'POST', body: `${ascii}a` };
    expect(requestErrors(tooLong)).toEqual([
      { path: ['body'], message: 'Expected a body of at most 1 MiB' },
    ]);
    // Half as many characters, each two bytes in UTF-8, plus one more.
    const wide = {
      path: '/posts/',
      method: 'POST',
      body: 'é'.repeat(FETCH_BODY_MAX_BYTES / 2 + 1),
    };
    expect(requestErrors(wide)).toEqual([
      { path: ['body'], message: 'Expected a body of at most 1 MiB' },
    ]);
    expect(requestErrors({ path: '/posts/', method: 'POST', body: {} })).toEqual([
      { path: ['body'], message: 'Expected the body as text' },
    ]);
  });

  it('refuses options it does not support rather than ignoring them', () => {
    expect(requestErrors({ path: '/posts/', credentials: 'include' })?.[0]?.path).toEqual([]);
    expect(FetchRequestSchema.safeParse(null).success).toBe(false);
  });
});

describe('a fetch response', () => {
  it('carries what a Response is built from', () => {
    const response = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"posts":[]}',
    };
    expect(FetchResponseSchema.parse(response)).toEqual(response);
  });

  it('only carries statuses a Response can be built with', () => {
    const response = { statusText: '', headers: {}, body: '' };
    expect(FetchResponseSchema.safeParse({ ...response, status: 599 }).success).toBe(true);
    for (const status of [0, 101, 199, 600, 200.5]) {
      expect(FetchResponseSchema.safeParse({ ...response, status }).success).toBe(false);
    }
  });
});
