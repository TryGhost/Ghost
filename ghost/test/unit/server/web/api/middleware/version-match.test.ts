import { expect } from 'vitest';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';

import { checkVersionMatch as versionMatch } from '../../../../../../core/server/web/api/middleware/version-match';

const app = (serverVersion: string) => {
  const result = express();

  result.use((_req, res, next) => {
    res.locals.version = serverVersion;
    next();
  });

  result.use(versionMatch);

  result.get('/', (_req, res) => {
    res.status(204);
    res.end();
  });

  result.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    res.status(500).json(err);
  });

  return result;
};

const expectOk = async (serverVersion: string, clientVersion?: string) => {
  const req = request(app(serverVersion)).get('/');
  if (clientVersion) {
    req.set('X-Ghost-Version', clientVersion);
  }
  await req.expect(204);
};

const expectNotOk = async (
  serverVersion: string,
  clientVersion: string,
  expectedErrorType: string,
) => {
  const { body } = await request(app(serverVersion))
    .get('/')
    .set('X-Ghost-Version', clientVersion)
    .expect(500);
  expect(body.errorType).toBe(expectedErrorType);
};

describe('Version Mismatch', function () {
  it('allows request if request does not include a version', async function () {
    const server = '1.5.1';

    await expectOk(server);
  });

  it('allows request if versions are an exact match', async function () {
    const server = '1.5.0';
    const client = '1.5';

    await expectOk(server, client);
  });

  it('allows request if client version is earlier than server', async function () {
    const server = '1.5.0';
    const client = '1.3';

    await expectOk(server, client);
  });

  it('disallows request with BadRequestError if client version is invalid', async function () {
    const server = '1.5.0';
    const client = 'bananarama';

    await expectNotOk(server, client, 'BadRequestError');
  });

  it('disallows request with VersionMismatchError if client version is earlier by a major version', async function () {
    const server = '2.5.0';
    const client = '1.3';

    await expectNotOk(server, client, 'VersionMismatchError');
  });

  it('disallows request with VersionMismatchError if client version is later than server', async function () {
    const server = '1.3.0';
    const client = '1.5';

    await expectNotOk(server, client, 'VersionMismatchError');
  });

  it('disallows request with VersionMismatchError if client version is later by a major version', async function () {
    const server = '1.5.0';
    const client = '2.3';

    await expectNotOk(server, client, 'VersionMismatchError');
  });

  it('allows request if pre-release is allowed', async function () {
    const server = '1.5.0-pre';
    const client = '1.4';

    await expectOk(server, client);
  });

  it('disallows request if server is a pre-release, but later by major version', async function () {
    const server = '2.0.0-alpha';
    const client = '1.5';

    await expectNotOk(server, client, 'VersionMismatchError');
  });
});
