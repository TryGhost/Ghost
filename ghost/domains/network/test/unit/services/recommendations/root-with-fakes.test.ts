import assert from 'node:assert/strict';
import { createLoggerFake } from '../../../../../../core/kernel/testing';
import type { NetworkDependencies } from '../../../../boot';

const ROOT_PATH = require.resolve('../../../../services/recommendations');
type Root = (typeof import('../../../../services/recommendations'))['default'];

// The root on its own. It imports nothing outside the domain, so a test hands
// it everything: no module is stubbed and nothing of Ghost is loaded but the
// domain. ./index.test.ts covers the root together with boot.ts.
describe('Recommendations service root, given fakes', function () {
  let root: Root;
  let original: NodeJS.Module | undefined;

  // A model as the repositories use one: they keep it and query it later.
  class Model {}

  function outside(overrides: Partial<NetworkDependencies> = {}) {
    const logging = createLoggerFake();
    const mappers: ((url: URL) => URL | undefined)[] = [];
    const sent: unknown[] = [];
    const dependencies: NetworkDependencies = {
      logging,
      // Config reaches the root as values. There is no config to fake.
      refreshesEnabled: true,
      environment: 'testing',
      sentry: { captureException() {} },
      urlUtils: { relativeToAbsolute: (url) => `https://site.example${url}` },
      externalRequest: { get: async () => ({ statusCode: 404, body: '' }) },
      settingsService: {
        read: () => ({ recommendations_enabled: { value: 'false' } }),
        edit() {},
      },
      sendEmail: async (...email) => {
        sent.push(email);
      },
      describeExternalPage: async () => undefined,
      // The database reaches the root as models. Nothing connects.
      models: {
        Recommendation: Model as never,
        RecommendationClickEvent: Model as never,
        RecommendationSubscribeEvent: Model as never,
      },
      mentions: {
        sendAll: async () => {},
        refreshMentions: async () => {},
        listMentions: async () => ({ data: [] }),
        addUrlMapper: (mapper) => {
          mappers.push(mapper);
        },
      },
      getStaffAlertRecipients: async () => [],
      staffService: {
        api: { emails: { renderHTML: async () => '', renderText: async () => '' } },
      },
      ...overrides,
    };
    return { dependencies, logging, mappers, sent };
  }

  beforeEach(function () {
    original = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    root = require(ROOT_PATH).default;
  });

  afterEach(function () {
    if (original) {
      require.cache[ROOT_PATH] = original;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  it('builds the service from what it is handed and registers one URL mapper', async function () {
    const { dependencies, logging, mappers } = outside();
    await root.init(dependencies);

    assert.equal(logging.entries.length, 0);
    assert.equal(mappers.length, 1);
    const mapped = mappers[0]!(new URL('https://other.example/.well-known/recommendations.json'));
    assert.equal(mapped?.toString(), 'https://other.example/');
    assert.equal(
      root.service.service.wellknownService.getURL().toString(),
      'https://site.example/.well-known/recommendations.json',
    );
  });

  it('says so, through the logger it was handed, when refreshes are off', async function () {
    const { dependencies, logging } = outside({ refreshesEnabled: false });
    await root.init(dependencies);
    assert.deepEqual(logging.logged('info'), [
      '[Recommendations] Background refreshes are disabled via config',
    ]);
  });

  it('refuses to start without what boot.ts supplies', async function () {
    // Boot never starts this root itself any more: the domain layer does.
    await assert.rejects(root.init(), TypeError);
  });
});
