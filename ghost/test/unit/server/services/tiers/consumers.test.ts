import assert from 'node:assert/strict';
import sinon from 'sinon';

const DomainEvents = require('@tryghost/domain-events');
// Load the real model registry before substituting the database connection.
require('../../../../../core/server/models');
const db = require('../../../../../core/server/data/db');
const tiers = require('../../../../../core/server/services/tiers').default;
const adminTiers = require('../../../../../core/server/api/endpoints/tiers');
const contentTiers = require('../../../../../core/server/api/endpoints/tiers-public');
const postsSerializer = require('../../../../../core/server/api/endpoints/utils/serializers/output/posts');
const pagesSerializer = require('../../../../../core/server/api/endpoints/utils/serializers/output/pages');
const previewsSerializer = require('../../../../../core/server/api/endpoints/utils/serializers/output/previews');
const emailPostsSerializer = require('../../../../../core/server/api/endpoints/utils/serializers/output/email-posts');
const membersMiddleware = require('../../../../../core/server/services/members/middleware');
const signingKeys = require('../../../../../core/server/services/signing-keys').default;
const newsletters = require('../../../../../core/server/services/newsletters').default;
const memberAttribution = require('../../../../../core/server/services/member-attribution').default;
const emailSuppressionList =
  require('../../../../../core/server/services/email-suppression-list').default;
const stripeCheckoutConfig =
  require('../../../../../core/server/services/stripe-checkout-config').default;

const membersApiFactoryPath = require.resolve('../../../../../core/server/services/members/api');
const membersApiPath =
  require.resolve('../../../../../core/server/services/members/members-api/members-api');
const giftsPath = require.resolve('../../../../../core/server/services/gifts');
const checkoutConfigPath =
  require.resolve('../../../../../core/server/services/stripe-checkout-config');
const metafieldsPath = require.resolve('../../../../../core/server/services/members-metafields');

type FakeTiersApi = Record<'browse' | 'read' | 'readDefaultTier' | 'add' | 'edit', sinon.SinonStub>;

/** An API whose every operation rejects with its own error, so callers stop at the tier read. */
function fakeTiersApi(name: string): FakeTiersApi & { failure: Error } {
  const failure = new Error(`${name} tiers API`);
  return {
    failure,
    browse: sinon.stub().rejects(failure),
    read: sinon.stub().rejects(failure),
    readDefaultTier: sinon.stub().rejects(failure),
    add: sinon.stub().rejects(failure),
    edit: sinon.stub().rejects(failure),
  };
}

describe('Tiers consumers', function () {
  const sandbox = sinon.createSandbox();
  const cached = new Map<string, NodeJS.Module | undefined>();

  let publishedApi: FakeTiersApi | undefined;

  /** Publishes an API on the shared root, as init does, until the case ends. */
  function useTiersApi(api: FakeTiersApi) {
    publishedApi = api;
  }

  beforeEach(function () {
    publishedApi = undefined;
    sandbox.stub(tiers, 'service').get(() => ({ api: publishedApi }));
  });

  /** Drops a module from the registry for this case, putting the original back afterwards. */
  function forget(path: string) {
    if (!cached.has(path)) {
      cached.set(path, require.cache[path]);
    }
    delete require.cache[path];
  }

  afterEach(function () {
    sandbox.restore();
    for (const [path, module] of cached) {
      delete require.cache[path];
      if (module) {
        require.cache[path] = module;
      }
    }
    cached.clear();
  });

  /** Calls the consumer under two published APIs in turn, expecting it to use each with its receiver. */
  async function assertReadsApiPerCall(
    method: keyof FakeTiersApi,
    call: () => Promise<unknown>,
    expectedArgs: unknown[],
  ) {
    for (const name of ['first', 'second']) {
      const api = fakeTiersApi(name);
      useTiersApi(api);

      await assert.rejects(call(), (error) => error === api.failure);

      sinon.assert.calledOnceWithExactly(api[method], ...expectedArgs);
      sinon.assert.calledOn(api[method], api);
    }
  }

  describe('Admin and Content endpoints', function () {
    it('browse through the API published when each request runs', async function () {
      const frame = { options: { filter: 'type:paid' } };

      await assertReadsApiPerCall('browse', () => adminTiers.browse.query(frame), [frame.options]);
      await assertReadsApiPerCall('browse', () => contentTiers.browse.query(frame), [
        frame.options,
      ]);
    });

    it('read, add and edit through the API published when each request runs', async function () {
      await assertReadsApiPerCall(
        'read',
        () => adminTiers.read.query({ data: { id: 'tier-id' } }),
        ['tier-id'],
      );

      const data = { name: 'Gold' };
      await assertReadsApiPerCall('add', () => adminTiers.add.query({ data }), [data]);
      await assertReadsApiPerCall(
        'edit',
        () => adminTiers.edit.query({ options: { id: 'tier-id' }, data }),
        ['tier-id', data],
      );
    });
  });

  describe('output serializers', function () {
    it('browse all tiers through the API published when each response is serialized', async function () {
      const frame = { options: {}, original: {}, apiType: 'content' };

      await assertReadsApiPerCall('browse', () => postsSerializer.all([], {}, frame), [{}]);
      await assertReadsApiPerCall('browse', () => pagesSerializer.all([], {}, frame), [{}]);
      await assertReadsApiPerCall('browse', () => previewsSerializer.all({}, {}, frame), [{}]);
      await assertReadsApiPerCall('browse', () => emailPostsSerializer.read({}, {}, frame), [{}]);
    });
  });

  describe('members', function () {
    it('looks up the free tier for access cookies through the API published on the root', async function () {
      const res = { getHeader: sinon.stub().returns([]), setHeader: sinon.stub() };

      await assertReadsApiPerCall(
        'browse',
        () => membersMiddleware.accessInfoSession({ member: null }, res, sinon.stub()),
        [],
      );
    });

    it('builds the members API over the tiers root, reading its API at each use', function () {
      const MembersApi = sandbox.stub().returns({});
      require(membersApiPath);
      const membersApiModule = require.cache[membersApiPath];
      assert.ok(membersApiModule);
      sandbox.replace(membersApiModule, 'exports', MembersApi);
      sandbox.stub(signingKeys, 'service').get(() => ({ forPurpose: () => ({}) }));
      sandbox.stub(newsletters, 'service').get(() => ({}));
      sandbox.stub(memberAttribution, 'service').get(() => ({}));
      sandbox.stub(emailSuppressionList, 'service').get(() => ({}));
      sandbox.stub(stripeCheckoutConfig, 'service').get(() => ({ checkouts: {} }));
      forget(membersApiFactoryPath);
      const createApiInstance = require(membersApiFactoryPath);

      createApiInstance({
        getTokenIssuer: () => 'issuer',
        getSigninURL: () => 'signin',
        getAllowSelfSignup: () => true,
        getEmailSupportAddress: () => 'support@example.com',
      });

      sinon.assert.calledOnce(MembersApi);
      const { tiersService } = MembersApi.firstCall.args[0];
      for (const name of ['first', 'second']) {
        const api = fakeTiersApi(name);
        useTiersApi(api);
        assert.equal(tiersService.api, api);
      }
    });
  });

  describe('gifts', function () {
    it('builds gift services over the tiers root, reading its API at each use', function () {
      sandbox.stub(DomainEvents, 'subscribe');
      forget(giftsPath);
      const gifts = require(giftsPath);

      gifts.init({
        apiUrl: 'https://example.com/ghost/api/admin/',
        schedulerAdapter: {
          schedule: sinon.stub(),
          unschedule: sinon.stub(),
          register: sinon.stub(),
        },
        internalKeys: {},
        checkouts: { read: sinon.stub() },
      });

      for (const service of [gifts.service, gifts.deliveryService]) {
        const { tiersService } = service.deps;
        for (const name of ['first', 'second']) {
          const api = fakeTiersApi(name);
          useTiersApi(api);
          assert.equal(tiersService.api, api);
        }
      }
    });
  });

  describe('Stripe Checkout previews', function () {
    it('read each tier through the API published when the preview runs', async function () {
      require(metafieldsPath);
      const metafields = require.cache[metafieldsPath];
      assert.ok(metafields);
      sandbox.replace(metafields, 'exports', { bindings: {}, fields: {} });
      sandbox.stub(db, 'knex').get(() => sinon.stub());
      forget(checkoutConfigPath);
      const root = require(checkoutConfigPath).default;
      await root.init();
      const { readTier } = root.service.previews.deps;

      await assertReadsApiPerCall('read', () => readTier('tier-id'), ['tier-id']);
    });
  });
});
