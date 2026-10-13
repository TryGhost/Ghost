import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sinon from 'sinon';
import type { buildSignedWebhookRequest } from '../../../../../core/server/lib/signed-webhook';

const rootPath =
  require.resolve('../../../../../core/server/services/export-requests/export-requests-service');
const endpointPath = require.resolve('../../../../../core/server/api/endpoints/exports');
const requestPath = require.resolve('@tryghost/request');
const config = require('../../../../../core/shared/config');
const logging = require('@tryghost/logging');
type Root =
  typeof import('../../../../../core/server/services/export-requests/export-requests-service');
type RequestOptions = ReturnType<typeof buildSignedWebhookRequest>;

describe('Export requests root with its endpoint', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeJS.Module | undefined>;
  let root: Root;
  let endpoint: {
    add: {
      query(frame: {
        data: { components: { content: boolean } };
        options: { context: { user: string } };
      }): Promise<void>;
    };
  };
  let request: sinon.SinonStub;
  let getConfig: sinon.SinonStub;

  beforeEach(function () {
    previousModules = new Map([rootPath, endpointPath].map((path) => [path, require.cache[path]]));
    for (const path of previousModules.keys()) {
      delete require.cache[path];
    }
    require(requestPath);
    request = sandbox.stub().resolves({ statusCode: 202 });

    getConfig = sandbox.stub(config, 'get').callThrough();
    sandbox.stub(logging, 'info');
    sandbox.stub(logging, 'error');
    sandbox.stub(Date, 'now').returns(1700000000000);
    const transportModule = require.cache[requestPath]!;
    const previousTransport = transportModule.exports;
    try {
      transportModule.exports = request;
      root = require(rootPath);
    } finally {
      transportModule.exports = previousTransport;
    }
    // Other modules loaded by the endpoint must retain the real transport.
    endpoint = require(endpointPath);
  });

  afterEach(function () {
    sandbox.restore();
    for (const [path, previous] of previousModules) {
      delete require.cache[path];
      if (previous) {
        require.cache[path] = previous;
      }
    }
  });

  function configure(host: string, secret: string, siteId: string) {
    getConfig.withArgs('hostSettings:export:webhookUrl').returns(host);
    getConfig.withArgs('hostSettings:export:webhookSecret').returns(secret);
    getConfig.withArgs('hostSettings:siteId').returns(siteId);
  }

  const frame = {
    data: { components: { content: true } },
    options: { context: { user: 'owner-id' } },
  };

  it('constructs without export config or delivery and the retained endpoint reads current config', async function () {
    sinon.assert.notCalled(request);
    assert.equal(getConfig.calledWith('hostSettings:export:webhookUrl'), false);
    // The endpoint must call the root's singleton, not an instance of its own.
    const requestExport = sandbox.spy(root.exportRequestsService, 'requestExport');

    for (const [host, secret, siteId] of [
      ['https://first.example/export/', 'first-test-secret', 'first-site'],
      ['https://second.example/export/', 'second-test-secret', 'second-site'],
    ]) {
      configure(host, secret, siteId);
      await endpoint.add.query(frame);
      const [url, options] = request.lastCall.args as [string, RequestOptions];
      assert.equal(url, host);
      assert.equal(options.method, 'POST');
      assert.deepEqual(options.retry, { limit: 0 });
      assert.deepEqual(options.timeout, { request: 30000 });
      assert.deepEqual(JSON.parse(options.body), {
        type: 'export',
        siteId,
        components: {
          content: true,
          members: false,
          analytics: false,
          themes: false,
          routes: false,
          media: false,
        },
        requestedByUserId: 'owner-id',
      });
      assert.equal(
        options.headers['X-Ghost-Signature'],
        crypto
          .createHmac('sha256', secret)
          .update(`1700000000000:${options.body}`)
          .digest('base64'),
      );
    }
    sinon.assert.calledTwice(request);
    sinon.assert.calledTwice(requestExport);
  });

  it('makes the endpoint wait for delivery and preserves the generic 502 on failure', async function () {
    configure('https://export.example/request/', 'test-secret', 'site-id');
    const delivery = Promise.withResolvers<void>();
    request.returns(delivery.promise);
    let settled = false;
    const result = endpoint.add.query(frame).finally(() => {
      settled = true;
    });
    const rejected = assert.rejects(result, {
      statusCode: 502,
      message: 'Failed to start the export. Please try again later.',
    });
    try {
      await Promise.resolve();
      assert.equal(settled, false);
      sinon.assert.calledOnce(request);
    } finally {
      delivery.reject(new Error('Transport unavailable'));
      await rejected;
    }
    sinon.assert.calledOnce(request);
  });
});
