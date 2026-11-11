import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import type { Knex } from 'knex';
import { getIP } from 'better-auth/api';
import {
  CLIENT_IP_HEADER,
  setClientIPHeader,
} from '../../../../../core/server/auth/better-auth/client-ip';
import { createAuth } from '../../../../../core/server/auth/better-auth/create-auth';
import { normalizeIP } from '../../../../../core/server/web/shared/middleware/api/backoff-limiter';

// Never blocks; the rate limits have their own tests
const allow = () => ({ consume: async () => ({ allowed: true as const }), reset: async () => {} });
const limiters = { globalBlock: allow, globalReset: allow, userLogin: allow, userReset: allow };

function withHeader(ip: string | undefined, headers: Record<string, string> = {}) {
  const req = { ip, headers: { ...headers } } as Request;
  let called = false;
  setClientIPHeader(
    req,
    {} as Response,
    (() => {
      called = true;
    }) as NextFunction,
  );
  assert.ok(called);
  return req;
}

describe('setClientIPHeader', function () {
  it('replaces a client-sent copy of the header with req.ip', function () {
    const req = withHeader('203.0.113.7', { [CLIENT_IP_HEADER]: '198.51.100.1' });

    assert.equal(req.headers[CLIENT_IP_HEADER], '203.0.113.7');
  });

  it('drops a client-sent copy when Express resolved no IP', function () {
    const req = withHeader(undefined, { [CLIENT_IP_HEADER]: '198.51.100.1' });

    assert.equal(Object.hasOwn(req.headers, CLIENT_IP_HEADER), false);
  });

  it('gives Better Auth the IP Ghost limiters key on, whatever the forwarded headers say', async function () {
    const auth = createAuth({
      db: {} as Knex,
      secret: 'a'.repeat(64),
      sessionMaxAgeMs: 1000,
      urlUtils: {
        getAdminUrl: () => undefined,
        getSiteUrl: () => 'https://example.com/',
        getSubdir: () => '',
        isSSL: () => true,
      },
      password: { hash: async () => '', compare: async () => false },
      logger: { debug() {}, info() {}, warn() {}, error() {} },
      limiters,
    });
    const { options } = await auth.$context;

    for (const ip of [
      '203.0.113.7',
      '::ffff:203.0.113.7',
      '2001:DB8::1',
      '2001:db8:0:0:1::1',
      '2001:db8:1:2:3:4:5:6',
      '::1',
    ]) {
      const req = withHeader(ip, { 'x-forwarded-for': '198.51.100.1' });
      const headers = new Headers(req.headers as Record<string, string>);

      assert.equal(
        getIP(new Request('https://example.com/', { headers }), options),
        normalizeIP(ip),
        ip,
      );
    }
  });
});
