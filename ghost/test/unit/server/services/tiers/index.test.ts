import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';

const DomainEvents = require('@tryghost/domain-events');
const { IncorrectUsageError } = require('@tryghost/errors');
const models = require('../../../../../core/server/models');
const TierRepository = require('../../../../../core/server/services/tiers/tier-repository');
const TiersAPI = require('../../../../../core/server/services/tiers/tiers-api');
const TierCreatedEvent = require('../../../../../core/server/services/tiers/tier-created-event');

const rootPath = require.resolve('../../../../../core/server/services/tiers');
const tiersApiPath = require.resolve('../../../../../core/server/services/tiers/tiers-api');

const FREE_ID = '0000000000000000000000a1';
const PAID_ID = '0000000000000000000000a2';

function productRow(json: Record<string, unknown>) {
  return {
    toJSON: () => ({
      welcome_page_url: null,
      visibility: 'public',
      trial_days: 0,
      description: null,
      created_at: new Date('2030-01-01T00:00:00Z'),
      updated_at: null,
      benefits: [],
      ...json,
    }),
  };
}

const freeRow = productRow({
  id: FREE_ID,
  name: 'Free',
  slug: 'free',
  active: true,
  type: 'free',
  currency: null,
  monthly_price: null,
  yearly_price: null,
});

const paidRow = productRow({
  id: PAID_ID,
  name: 'Gold',
  slug: 'gold',
  active: true,
  type: 'paid',
  currency: 'usd',
  monthly_price: 500,
  yearly_price: 5000,
  benefits: [{ name: 'Extra posts' }],
});

function fakeProductModel() {
  // A function, like the Bookshelf model it replaces.
  return Object.assign(function Product() {}, {
    findAll: sinon.stub().resolves([freeRow, paidRow]),
    generateSlug: sinon.stub().resolves('generated-slug'),
    add: sinon.stub().resolves(),
    edit: sinon.stub().resolves(),
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Tiers root', function () {
  const sandbox = sinon.createSandbox();
  const cached = new Map<string, NodeJS.Module | undefined>();
  let Product: ReturnType<typeof fakeProductModel>;
  let dispatch: sinon.SinonStub;

  /** A fresh root, so each case starts uninitialized. */
  function loadRoot() {
    delete require.cache[rootPath];
    return require(rootPath).default;
  }

  beforeEach(function () {
    cached.set(rootPath, require.cache[rootPath]);
    Product = fakeProductModel();
    sandbox.replace(models, 'Product', Product);
    dispatch = sandbox.stub(DomainEvents, 'dispatch');
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

  it('exports one root, with nothing published or loaded before init', function () {
    const root = loadRoot();

    assert.equal(typeof root.init, 'function');
    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(Product.findAll);
  });

  it('publishes a primed repository and an API that reads through it', async function () {
    const root = loadRoot();

    await root.init();

    sinon.assert.calledOnceWithExactly(Product.findAll, { withRelated: ['benefits'] });
    assert.ok(root.service.repository instanceof TierRepository);
    assert.ok(root.service.api instanceof TiersAPI);

    const page = await root.service.api.browse();
    assert.deepEqual(
      page.data.map((tier: { name: string; benefits: string[] }) => [tier.name, tier.benefits]),
      [
        ['Free', []],
        ['Gold', ['Extra posts']],
      ],
    );

    // The API reads through the published repository, not a separate instance.
    const sentinel = { id: 'sentinel' };
    const getById = sandbox.stub(root.service.repository, 'getById').resolves(sentinel);
    assert.equal(await root.service.api.read(PAID_ID), sentinel);
    sinon.assert.calledOnce(getById);
    assert.equal(getById.firstCall.args[0].toHexString(), PAID_ID);
  });

  it('waits for priming before publishing the repository or the API', async function () {
    const loading = deferred<unknown[]>();
    Product.findAll.returns(loading.promise);
    const root = loadRoot();

    const initialization = root.init();
    // Drain runnable promise continuations while priming stays unresolved.
    await setImmediate();

    sinon.assert.calledOnce(Product.findAll);
    assert.throws(() => root.service, IncorrectUsageError);

    loading.resolve([paidRow]);
    await initialization;

    assert.ok(root.service.repository);
    const page = await root.service.api.browse();
    assert.deepEqual(
      page.data.map((tier: { name: string }) => tier.name),
      ['Gold'],
    );
  });

  it('publishes nothing when priming rejects, and loads again on the next init', async function () {
    const failure = new Error('Products unavailable');
    Product.findAll.onFirstCall().rejects(failure);
    const root = loadRoot();

    await assert.rejects(root.init(), (error) => error === failure);

    assert.throws(() => root.service, IncorrectUsageError);

    await root.init();

    sinon.assert.calledTwice(Product.findAll);
    assert.ok(root.service.repository instanceof TierRepository);
    const page = await root.service.api.browse();
    assert.equal(page.data.length, 2);
  });

  it('publishes no API when its construction fails, and builds one on the next init', async function () {
    const failure = new Error('API unavailable');
    const tiersApiModule = require.cache[tiersApiPath];
    assert.ok(tiersApiModule);
    const RealTiersAPI = tiersApiModule.exports;
    const construct = sandbox.stub().onFirstCall().throws(failure);
    sandbox.replace(
      tiersApiModule,
      'exports',
      class extends RealTiersAPI {
        constructor(deps: unknown) {
          construct(deps);
          super(deps);
        }
      },
    );
    const root = loadRoot();

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, IncorrectUsageError);

    await root.init();

    sinon.assert.calledTwice(construct);
    assert.ok(root.service.api instanceof RealTiersAPI);
    assert.equal(construct.secondCall.args[0].repository, root.service.repository);
  });

  it('keeps the same repository and API across later init calls without loading again', async function () {
    const root = loadRoot();
    await root.init();
    const { repository, api } = root.service;

    await root.init();

    assert.equal(root.service.repository, repository);
    assert.equal(root.service.api, api);
    sinon.assert.calledOnce(Product.findAll);
  });

  it('settles overlapping init calls with an API reading through the published repository', async function () {
    // defineService shares one pending initialization between overlapping calls; its own
    // tests cover that. Boot calls init once, so only the settled state is pinned here.
    const loading = deferred<unknown[]>();
    Product.findAll.returns(loading.promise);
    const root = loadRoot();

    const first = root.init();
    const second = root.init();
    loading.resolve([paidRow]);
    await Promise.all([first, second]);

    const sentinel = { id: 'sentinel' };
    sandbox.stub(root.service.repository, 'getById').resolves(sentinel);
    assert.equal(await root.service.api.read(PAID_ID), sentinel);
  });

  it('generates slugs through the current Product model and saves through the one loaded at init', async function () {
    const root = loadRoot();
    await root.init();
    const tierData = {
      name: 'Silver',
      visibility: 'public',
      currency: 'usd',
      monthlyPrice: 300,
      yearlyPrice: 3000,
    };

    const tier = await root.service.api.add(tierData);

    sinon.assert.calledOnceWithExactly(Product.generateSlug, Product, 'Silver', {});
    assert.equal(tier.slug, 'generated-slug');
    sinon.assert.calledOnce(Product.add);
    assert.equal(Product.add.firstCall.args[0].slug, 'generated-slug');
    sinon.assert.calledOnce(dispatch);
    assert.ok(dispatch.firstCall.args[0] instanceof TierCreatedEvent);
    assert.equal(dispatch.firstCall.args[0].data.tier, tier);

    // Slugs look the model up on each call; the repository keeps the model from init.
    const replacement = fakeProductModel();
    replacement.generateSlug.resolves('replacement-slug');
    // Restored with the sandbox's replacement in afterEach.
    models.Product = replacement;

    const second = await root.service.api.add({ ...tierData, slug: 'requested' });

    sinon.assert.calledOnceWithExactly(replacement.generateSlug, replacement, 'requested', {});
    assert.equal(second.slug, 'replacement-slug');
    sinon.assert.calledTwice(Product.add);
    sinon.assert.notCalled(replacement.add);
  });

  it('needs the API as the receiver of its operations', async function () {
    const root = loadRoot();
    await root.init();
    const { browse, read } = root.service.api;

    await assert.rejects(browse(), TypeError);
    await assert.rejects(read(PAID_ID), TypeError);
  });
});
