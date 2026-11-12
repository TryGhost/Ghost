import assert from 'node:assert/strict';
import sinon from 'sinon';

const errors = require('@tryghost/errors');
const offers = require('../../../../../core/server/services/offers');
const adminOffers = require('../../../../../core/server/api/endpoints/offers');
const contentOffers = require('../../../../../core/server/api/endpoints/offers-public');
const signingKeys = require('../../../../../core/server/services/signing-keys').default;
const newsletters = require('../../../../../core/server/services/newsletters').default;
const memberAttribution = require('../../../../../core/server/services/member-attribution').default;
const stripeCheckoutConfig =
  require('../../../../../core/server/services/stripe-checkout-config').default;
const tiers = require('../../../../../core/server/services/tiers').default;

const membersApiFactoryPath = require.resolve('../../../../../core/server/services/members/api');
const membersApiPath =
  require.resolve('../../../../../core/server/services/members/members-api/members-api');
const siteAppPath = require.resolve('../../../../../core/frontend/web/site');
const sharedExpressPath = require.resolve('../../../../../core/shared/express');

type FakeOffersApi = Record<
  'listOffers' | 'getOffer' | 'updateOffer' | 'createOffer',
  sinon.SinonStub
>;

function fakeOffersApi(result: unknown) {
  return {
    listOffers: sinon.stub().resolves(result),
    getOffer: sinon.stub().resolves(result),
    updateOffer: sinon.stub().resolves(result),
    createOffer: sinon.stub().resolves(result),
  };
}

describe('Offers consumers', function () {
  const sandbox = sinon.createSandbox();
  const cached = new Map<string, NodeJS.Module | undefined>();

  /** Drops a module from the registry for this case, putting the original back afterwards. */
  function forget(path: string) {
    if (!cached.has(path)) {
      cached.set(path, require.cache[path]);
    }
    delete require.cache[path];
  }

  let publishedApi: FakeOffersApi | null;

  /** Publishes an API on the shared root, as init does, until the case ends. */
  function useOffersApi(api: FakeOffersApi) {
    publishedApi = api;
  }

  beforeEach(function () {
    publishedApi = null;
    sandbox.stub(offers, 'api').get(() => publishedApi);
  });

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

  /** Runs the endpoint under two published APIs in turn, expecting it to use each with its receiver. */
  async function assertReadsApiPerCall(
    method: keyof FakeOffersApi,
    call: () => Promise<unknown>,
    expectedArgs: unknown[],
  ) {
    for (const name of ['first', 'second']) {
      const offer = { id: `${name}-offer` };
      const api = fakeOffersApi(method === 'listOffers' ? [offer] : offer);
      useOffersApi(api);

      const result = await call();

      sinon.assert.calledOnceWithExactly(api[method], ...expectedArgs);
      sinon.assert.calledOn(api[method], api);
      assert.deepEqual(result, { data: [offer] });
    }
  }

  describe('Admin and Content endpoints', function () {
    it('browse through the API published when each request runs', async function () {
      const frame = { options: { filter: 'status:active' } };

      await assertReadsApiPerCall('listOffers', () => adminOffers.browse.query(frame), [
        frame.options,
      ]);
    });

    it('read through the API published when each request runs', async function () {
      const frame = { data: { id: 'offer-id' } };

      await assertReadsApiPerCall('getOffer', () => adminOffers.read.query(frame), [frame.data]);
      await assertReadsApiPerCall('getOffer', () => contentOffers.read.query(frame), [frame.data]);
    });

    it('add and edit through the API published when each request runs', async function () {
      const options = { id: 'offer-id', context: { user: 'user-id' } };
      const data = { offers: [{ name: 'Spring', id: 'ignored' }] };

      await assertReadsApiPerCall('createOffer', () => adminOffers.add.query({ data, options }), [
        data.offers[0],
        options,
      ]);
      await assertReadsApiPerCall('updateOffer', () => adminOffers.edit.query({ data, options }), [
        { name: 'Spring', id: 'offer-id' },
        options,
      ]);
    });

    it('answer a missing offer with NotFoundError', async function () {
      useOffersApi(fakeOffersApi(null));
      const frame = { data: { id: 'offer-id' }, options: { id: 'offer-id' } };

      await assert.rejects(adminOffers.read.query(frame), errors.NotFoundError);
      await assert.rejects(contentOffers.read.query(frame), errors.NotFoundError);
      await assert.rejects(
        adminOffers.edit.query({ ...frame, data: { offers: [{ name: 'Spring' }] } }),
        errors.NotFoundError,
      );
    });
  });

  describe('site app', function () {
    it('mounts the redirect middleware the root exposes when the site app is set up', function () {
      const redirects = sinon.stub();
      let reads = 0;
      sandbox.stub(offers, 'middleware').get(() => {
        reads += 1;
        return redirects;
      });
      const stop = new Error('stop after the offers middleware');
      const mounted: unknown[] = [];
      const app = {
        set: sinon.stub(),
        use: sinon.stub().callsFake((handler: unknown) => {
          mounted.push(handler);
          if (handler === redirects) {
            throw stop;
          }
        }),
      };
      // Load the site app's dependencies with the real express first, so only the site app
      // re-evaluated below captures the substitute.
      require(siteAppPath);
      const sharedExpress = require.cache[sharedExpressPath];
      assert.ok(sharedExpress);
      sandbox.replace(
        sharedExpress,
        'exports',
        Object.assign(() => app, sharedExpress.exports),
      );
      forget(siteAppPath);
      const setupSiteApp = require(siteAppPath);

      // Importing the site app does not read the middleware; setting it up does, once.
      assert.equal(reads, 0);
      assert.throws(
        () => setupSiteApp({}),
        (error) => error === stop,
      );

      assert.equal(reads, 1);
      // Mounted right after CORS, ahead of link and custom redirects.
      assert.equal(mounted.length, 2);
      assert.equal(mounted[1], redirects);
    });
  });

  describe('members', function () {
    it('passes the API published when the members API is built, and keeps it', function () {
      const MembersApi = sandbox.stub().returns({});
      require(membersApiPath);
      const membersApiModule = require.cache[membersApiPath];
      assert.ok(membersApiModule);
      sandbox.replace(membersApiModule, 'exports', MembersApi);
      sandbox.stub(signingKeys, 'service').get(() => ({ forPurpose: () => ({}) }));
      sandbox.stub(newsletters, 'service').get(() => ({}));
      sandbox.stub(memberAttribution, 'service').get(() => ({}));
      sandbox.stub(stripeCheckoutConfig, 'service').get(() => ({ checkouts: {} }));
      sandbox.stub(tiers, 'service').get(() => ({ api: {} }));
      forget(membersApiFactoryPath);
      const createApiInstance = require(membersApiFactoryPath);
      const builtWith = fakeOffersApi(null);
      useOffersApi(builtWith);

      createApiInstance({
        getTokenIssuer: () => 'issuer',
        getSigninURL: () => 'signin',
        getAllowSelfSignup: () => true,
        getEmailSupportAddress: () => 'support@example.com',
      });

      sinon.assert.calledOnce(MembersApi);
      // A plain value read once at construction, not a getter over the root.
      const passed = Object.getOwnPropertyDescriptor(MembersApi.firstCall.args[0], 'offersAPI');
      assert.equal(passed?.value, builtWith);
    });
  });
});
