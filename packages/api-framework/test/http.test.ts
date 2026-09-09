import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { SinonStub } from 'sinon';
import * as shared from '../src/index.ts';

describe('HTTP', function () {
  type Handler = ReturnType<typeof shared.http>;
  type Request = Parameters<Handler>[0];
  type Response = {
    headers: Record<string, string | number>;
    json: SinonStub;
    send: SinonStub;
    set(headers: Record<string, string | number>): void;
    status: SinonStub;
  };
  type ApiImplementation = SinonStub & {
    response?: { format: string | (() => string | Promise<string>) };
    statusCode?: number | SinonStub;
  };

  let req: Request;
  let res: Response;
  let next: SinonStub;
  let headersGetStub: SinonStub;

  beforeEach(function () {
    req = {
      body: { a: 'a' },
      get: sinon.stub().returns('fallback.example.com'),
      originalUrl: '/ghost/api/content/posts/',
      params: {},
      query: {},
      secure: true,
      url: 'https://example.com/ghost/api/content/',
      vhost: { host: 'example.com' },
    };
    const response = {
      headers: {},
      json: sinon.stub(),
      send: sinon.stub(),
      set(headers: Record<string, string | number>) {
        response.headers = headers;
      },
      status: sinon.stub(),
    };
    res = response;
    next = sinon.stub();

    headersGetStub = sinon.stub(shared.headers, 'get').resolves();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('check options', function () {
    const apiImpl = sinon.stub().resolves();
    shared.http(apiImpl)(req, res, next);

    const frame = apiImpl.firstCall.firstArg;
    assert.deepEqual(Object.keys(frame), [
      'original',
      'options',
      'data',
      'user',
      'file',
      'files',
      'apiType',
      'docName',
      'method',
      'response',
    ]);

    assert.deepEqual(frame.data, { a: 'a' });
    assert.deepEqual(frame.options, {
      context: {
        api_key: null,
        integration: null,
        user: null,
        member: null,
      },
    });
  });

  it('api response is fn', async function () {
    await new Promise<void>((resolve) => {
      const response = sinon.stub().callsFake(function (_req, _res, _next) {
        assert.ok(_req);
        assert.ok(_res);
        assert.ok(_next);
        assert.equal(apiImpl.calledOnce, true);
        assert.equal(_res.json.called, false);
        resolve();
      });

      const apiImpl = sinon.stub().resolves(response);
      shared.http(apiImpl)(req, res, next);
    });
  });

  it('api response is fn (data)', async function () {
    await new Promise<void>((resolve) => {
      const apiImpl = sinon.stub().resolves('data');

      next.callsFake(resolve);

      res.json.callsFake(function () {
        assert.equal(headersGetStub.calledOnce, true);
        assert.equal(res.status.calledOnce, true);
        assert.equal(res.send.called, false);
        resolve();
      });

      shared.http(apiImpl)(req, res, next);
    });
  });

  it('handles api key, user and plain text response', async function () {
    await new Promise<void>((resolve) => {
      req.vhost = null;
      req.user = { id: 'user-id' };
      req.api_key = {
        get(key) {
          return {
            id: 'api-key-id',
            type: 'admin',
            integration_id: 'integration-id',
          }[key];
        },
      };

      const apiImpl: ApiImplementation = sinon.stub().resolves('plain body');
      apiImpl.response = { format: 'plain' };
      apiImpl.statusCode = 201;

      res.send.callsFake(() => {
        assert.equal(res.status.calledOnceWithExactly(201), true);
        assert.equal(res.headers.constructor, Object);
        assert.equal(res.json.called, false);

        const frame = apiImpl.firstCall.firstArg;
        assert.equal(frame.options.context.api_key.id, 'api-key-id');
        assert.equal(frame.options.context.integration.id, 'integration-id');
        assert.equal(frame.options.context.user, 'user-id');
        resolve();
      });

      shared.http(apiImpl)(req, res, next);
    });
  });

  it('supports async response format and statusCode function', async function () {
    await new Promise<void>((resolve) => {
      const apiImpl: ApiImplementation = sinon.stub().resolves({ ok: true });
      const statusCode = sinon.stub().returns(204);
      apiImpl.statusCode = statusCode;
      apiImpl.response = {
        format() {
          return Promise.resolve('plain');
        },
      };

      res.send.callsFake(() => {
        assert.equal(statusCode.calledOnce, true);
        assert.equal(res.status.calledOnceWithExactly(204), true);
        resolve();
      });

      shared.http(apiImpl)(req, res, next);
    });
  });

  it('supports sync response format function', async function () {
    await new Promise<void>((resolve) => {
      const apiImpl: ApiImplementation = sinon.stub().resolves('plain body');
      apiImpl.response = {
        format() {
          return 'plain';
        },
      };

      res.send.callsFake(() => {
        assert.equal(res.send.calledOnce, true);
        assert.equal(res.json.called, false);
        resolve();
      });

      shared.http(apiImpl)(req, res, next);
    });
  });

  it('passes errors to next with frame options', async function () {
    await new Promise<void>((resolve) => {
      const error = new Error('failure');
      const apiImpl = sinon.stub().rejects(error);

      next.callsFake((err) => {
        assert.equal(err, error);
        assert.deepEqual(req.frameOptions, {
          docName: null,
          method: null,
        });
        resolve();
      });

      shared.http(apiImpl)(req, res, next);
    });
  });

  it('uses req.url pathname when originalUrl is missing', async function () {
    await new Promise<void>((resolve) => {
      req.originalUrl = undefined;
      req.url = '/ghost/api/content/posts/?include=authors';

      const apiImpl = sinon.stub().resolves({});
      res.json.callsFake(() => {
        const frame: shared.Frame = apiImpl.firstCall.firstArg;
        assert.ok(frame.original.url);
        assert.equal(frame.original.url.pathname, '/ghost/api/content/posts/');
        resolve();
      });

      shared.http(apiImpl)(req, res, next);
    });
  });
});
