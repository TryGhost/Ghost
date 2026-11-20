import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Knex } from 'knex';
import { createAuth } from '../../../../../../core/server/auth/better-auth/create-auth';
import {
  BODY_SIZE_LIMIT,
  betterAuthRouter,
} from '../../../../../../core/server/web/api/endpoints/admin/better-auth';

const allow = () => ({ consume: async () => ({ allowed: true as const }), reset: async () => {} });

// Validation rejects these bodies before anything reaches the database
function buildAuth() {
  return createAuth({
    db: {} as Knex,
    secret: 'a'.repeat(64),
    sessionMaxAgeMs: 15552000000,
    urlUtils: {
      getAdminOrigin: () => 'http://localhost',
      getSubdir: () => '',
      isSSL: () => false,
    },
    password: { hash: async (p) => p, compare: async () => false },
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    limiters: {
      globalBlock: allow,
      globalReset: allow,
      userLogin: allow,
      userReset: allow,
      sendVerificationCode: allow,
      userVerification: allow,
      verificationEmail: allow,
    },
    sendPasswordResetEmail: async () => {},
    isStaffDeviceVerificationEnabled: () => true,
    isEmailMfaRequired: () => false,
    sendDeviceVerificationCode: async () => {},
    getRequestOrigin: (headers) => headers.get('origin'),
  });
}

describe('Better Auth native routes body size', function () {
  let server: http.Server;
  let port: number;

  beforeAll(async function () {
    const app = express();
    app.use('/ghost/api/admin', betterAuthRouter(buildAuth()));
    app.use(
      (
        err: { statusCode?: number },
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(err.statusCode ?? 500).end();
      },
    );
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => {
      server.once('listening', resolve);
    });
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async function () {
    server.closeAllConnections();
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  // Writes the body in chunks without a content-length unless one is given
  function post(
    chunks: string[],
    headers: Record<string, string | number> = {},
    path = '/auth/sign-in/email',
  ) {
    return new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          method: 'POST',
          path: `/ghost/api/admin${path}`,
          headers: {
            host: 'localhost',
            origin: 'http://localhost',
            'content-type': 'application/json',
            ...headers,
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      // The server may answer and close before the whole body is sent
      req.on('error', reject);
      for (const chunk of chunks) {
        req.write(chunk);
      }
      req.end();
    });
  }

  const small = JSON.stringify({ email: 'not-an-email', password: 'x' });

  it('passes a small body through to Better Auth', async function () {
    const response = await post([small], { 'content-length': Buffer.byteLength(small) });

    assert.equal(response.status, 400);
    assert.equal(JSON.parse(response.body).code, 'INVALID_EMAIL');
  });

  it('passes a small chunked body through to Better Auth', async function () {
    const response = await post([small.slice(0, 10), small.slice(10)]);

    assert.equal(response.status, 400);
    assert.equal(JSON.parse(response.body).code, 'INVALID_EMAIL');
  });

  it('leaves an empty body absent, as sign-out sends it', async function () {
    const response = await post([], { 'content-length': 0 }, '/auth/sign-out');

    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), { success: true });
  });

  it('rejects a body whose content-length is over the limit', async function () {
    const large = 'x'.repeat(BODY_SIZE_LIMIT + 1);
    const response = await post([large], { 'content-length': large.length });

    assert.equal(response.status, 413);
  });

  it('stops reading a chunked body once it passes the limit', async function () {
    const padding = 'x'.repeat(16 * 1024);
    const chunks = [`{"email":"a@example.com","password":"`];
    for (let i = 0; i < 8; i++) {
      chunks.push(padding);
    }
    chunks.push('"}');

    const response = await post(chunks);

    assert.equal(response.status, 413);
  });
});
