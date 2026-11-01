import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Knex } from 'knex';

const rootPath = require.resolve('../../../../../core/server/services/app-installations');
const endpointPaths = [
  require.resolve('../../../../../core/server/api/endpoints/app-installations'),
  require.resolve('../../../../../core/server/api/endpoints/app-installation-previews'),
  require.resolve('../../../../../core/server/api/endpoints/app-sessions'),
];
const requestPath = require.resolve('../../../../../core/server/lib/request-external');
// Load the real model registry before substituting the root's database connection.
const models = require('../../../../../core/server/models');
const db = require('../../../../../core/server/data/db');
const { IncorrectUsageError } = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const config = require('../../../../../core/shared/config');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const { AppInstallationsService } =
  require('../../../../../core/server/services/app-installations/service') as typeof import('../../../../../core/server/services/app-installations/service');
type Root = typeof import('../../../../../core/server/services/app-installations').default;
const { generateTestAppKeys, signTestManifest, answerTestChallenge } =
  require('../../../../utils/app-identity') as typeof import('../../../../utils/app-identity');
type TestAppKeys = import('../../../../utils/app-identity').TestAppKeys;

const MANIFEST_URL = 'https://podcast.example/manifest.json';

let keys: TestAppKeys;

function manifestFor(manifestUrl: string) {
  return {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes.',
    author: { name: 'Example Audio', url: 'https://example.com' },
    accent_color: '#ff5500',
    icon: { name: 'audio-lines' },
    surfaces: [{ type: 'admin_page', url: '/admin' }],
    manifest_url: manifestUrl,
    identity_key: keys.identity.publicJwk,
    backend_key: keys.backend.publicJwk,
    development: new URL(manifestUrl).hostname === 'localhost',
  };
}

const manifest = { id: 'com.example.podcast' };

describe('App installations composition root', function () {
  const sandbox = sinon.createSandbox();
  let previousModules: Map<string, NodeJS.Module | undefined>;
  let root: Root;
  let readKnex: sinon.SinonStub;
  let query: sinon.SinonStub;
  let request: sinon.SinonStub;

  beforeAll(async function () {
    keys = await generateTestAppKeys();
  });

  beforeEach(function () {
    previousModules = new Map(
      [rootPath, ...endpointPaths].map((path) => [path, require.cache[path]]),
    );
    for (const path of previousModules.keys()) {
      delete require.cache[path];
    }
    const builder = {
      join: sandbox.stub().returnsThis(),
      where: sandbox.stub().returnsThis(),
      orderBy: sandbox.stub().returnsThis(),
      first: sandbox.stub().resolves(undefined),
    };
    query = sandbox.stub().returns(builder);
    readKnex = sandbox.stub().returns(query as unknown as Knex);
    sandbox.stub(db, 'knex').get(readKnex);
    // Substitute only the outbound transport; keep the real fetcher, manifest validation and
    // identity check. It serves the signed manifest, and answers challenges as the app's
    // backend.
    require(requestPath);
    request = sandbox
      .stub()
      .callsFake((url: URL, options: { body?: string; headers: { host?: string } }) => {
        // As the browser would see it, without the localhost alias.
        const asked = new URL(url.href);
        if (options.headers.host) {
          asked.host = options.headers.host;
        }
        const text = options.body
          ? answerTestChallenge(options.body, keys.backend, asked.href)
          : signTestManifest(manifestFor(asked.href), keys.identity).then((signed) =>
              JSON.stringify(signed),
            );
        return Object.assign(Promise.resolve({ statusCode: 200 }), {
          on: () => {},
          text: () => text,
        });
      });
    sandbox.replace(require.cache[requestPath]!, 'exports', request);
    root = require(rootPath).default;
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

  it('acquires the database only at init and retains one instance without queries or requests', async function () {
    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(readKnex);
    await root.init();
    const service = root.service;
    assert.ok(service instanceof AppInstallationsService);
    await root.init();
    assert.equal(root.service, service);
    sinon.assert.calledOnce(readKnex);
    sinon.assert.notCalled(query);
    sinon.assert.notCalled(request);
  });

  it('leaves the root unpublished after a dependency failure and permits a later init', async function () {
    const failure = new Error('Database is not ready');
    readKnex.onFirstCall().throws(failure);
    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, IncorrectUsageError);
    await root.init();
    assert.ok(root.service instanceof AppInstallationsService);
    sinon.assert.calledTwice(readKnex);
  });

  it('lets the controllers loaded before init use the initialized instance', async function () {
    const installations = require(endpointPaths[0]);
    const previews = require(endpointPaths[1]);
    const sessions = require(endpointPaths[2]);
    sinon.assert.notCalled(readKnex);
    await root.init();
    const browse = sandbox.stub(AppInstallationsService.prototype, 'browse').resolves([]);
    const preview = sandbox.spy(AppInstallationsService.prototype, 'preview');
    const startSession = sandbox
      .stub(AppInstallationsService.prototype, 'startSession')
      .resolves({ revision: 0 } as never);
    sandbox.stub(config, 'get').withArgs('env').returns('production');
    sandbox.stub(urlUtils, 'urlFor').returns('https://publication.example/');

    assert.deepEqual(await installations.browse.query(), []);
    const result = await previews.add.query({
      data: {
        app_installation_previews: [{ manifest_url: MANIFEST_URL }],
      },
    });
    assert.equal(result.manifest.id, manifest.id);
    assert.equal(browse.firstCall.thisValue, root.service);
    assert.equal(preview.firstCall.thisValue, root.service);
    assert.deepEqual(await sessions.start.query({ options: { id: 'installation-id' } }), {
      revision: 0,
    });
    sinon.assert.calledOnceWithExactly(startSession, 'installation-id');
    assert.equal(startSession.firstCall.thisValue, root.service);
  });

  it('wires logging through the manifest loader and fetcher', async function () {
    const failure = new Error('Transport failed');
    const warn = sandbox.stub(logging, 'warn');
    request.returns({ on: () => {}, text: sandbox.stub().rejects(failure) });
    sandbox.stub(config, 'get').withArgs('env').returns('production');
    sandbox.stub(urlUtils, 'urlFor').returns('https://publication.example/');
    await root.init();

    const manifestUrl = 'https://podcast.example/manifest.json';
    await assert.rejects(root.service.preview(manifestUrl), {
      code: 'APP_MANIFEST_UNREACHABLE',
      message: 'Could not load the app’s manifest.',
      context: manifestUrl,
    });

    sinon.assert.calledTwice(warn);
    sinon.assert.calledWithExactly(
      warn.firstCall,
      `Could not load the app manifest at ${manifestUrl}`,
    );
    sinon.assert.calledWithExactly(warn.secondCall, failure);
  });

  it('logs action recording failures without failing the installation', async function () {
    const failure = new Error('History write failed');
    const error = sandbox.stub(logging, 'error');
    const add = sandbox.stub(models.Action, 'add').rejects(failure);
    const insert = sandbox.stub().resolves();
    const trx = sandbox.stub().returns({ insert });
    Object.assign(query, {
      transaction: async (write: (connection: Knex.Transaction) => Promise<void>) =>
        write(trx as unknown as Knex.Transaction),
    });
    sandbox.stub(config, 'get').withArgs('env').returns('production');
    sandbox.stub(urlUtils, 'urlFor').returns('https://publication.example/');
    await root.init();
    const manifestUrl = 'https://podcast.example/manifest.json';
    const preview = await root.service.preview(manifestUrl);

    const installed = await root.service.create(
      { actor: { id: 'staff-id', type: 'user' } },
      { manifestUrl, digest: preview.digest },
    );

    assert.equal(installed.app_id, manifest.id);
    sinon.assert.calledTwice(insert);
    sinon.assert.calledOnce(add);
    assert.equal(add.firstCall.args[0].resource_id, installed.id);
    sinon.assert.calledOnceWithExactly(error, failure);
  });

  // Found at boot, rather than failing every app.
  it('refuses to start with trusted origins that aren’t origins', async function () {
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('apps').returns({ trustedOrigins: ['https://app.example.net/ghost'] });

    await assert.rejects(root.init(), {
      errorType: 'InternalServerError',
      code: 'APP_CONFIG_INVALID',
    });
  });

  it('reads manifest rules and the development localhost alias per operation', async function () {
    const getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('env').returns('development');
    getConfig.withArgs('apps').returns({ localhostAlias: 'first-alias.example' });
    const urlFor = sandbox.stub(urlUtils, 'urlFor');
    urlFor.withArgs('home', true).returns('https://publication.example/');
    urlFor.withArgs('admin', true).returns('https://publication.example/ghost/');
    await root.init();
    const service = root.service;

    await service.preview('http://localhost:8080/manifest.json');
    assert.equal(request.lastCall.args[0].hostname, 'first-alias.example');
    getConfig.withArgs('apps').returns({ localhostAlias: 'second-alias.example' });
    await service.preview('http://localhost:8080/manifest.json');
    assert.equal(request.lastCall.args[0].hostname, 'second-alias.example');

    getConfig.withArgs('env').returns('production');
    await assert.rejects(service.preview('http://localhost:8080/manifest.json'), {
      errorType: 'ValidationError',
    });
    sinon.assert.calledTwice(request);
    urlFor.withArgs('home', true).returns('https://podcast.example/');
    await assert.rejects(service.preview('https://podcast.example/manifest.json'), {
      errorType: 'ValidationError',
    });
    // The manifest, and the challenge that goes out with it.
    sinon.assert.callCount(request, 4);
    assert.equal(request.lastCall.args[0].hostname, 'podcast.example');
    // The Admin URL is a separate rule from the site URL.
    urlFor.withArgs('admin', true).returns('https://admin.example/ghost/');
    await assert.rejects(service.preview('https://admin.example/manifest.json'), {
      errorType: 'ValidationError',
    });
    sinon.assert.callCount(request, 6);
    assert.equal(request.lastCall.args[0].hostname, 'admin.example');
    assert.equal(root.service, service);
  });
});
