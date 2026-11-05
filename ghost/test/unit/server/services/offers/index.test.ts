import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import express from 'express';
import request from 'supertest';
import sinon from 'sinon';
import configUtils from '../../../../utils/config-utils';

const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const models = require('../../../../../core/server/models');
const sentry = require('../../../../../core/shared/sentry');
const OffersAPI = require('../../../../../core/server/services/offers/application/offers-api');
const OfferCreatedEvent = require('../../../../../core/server/services/offers/domain/events/offer-created-event');
const OfferCodeChangeEvent = require('../../../../../core/server/services/offers/domain/events/offer-code-change-event');

const rootPath = require.resolve('../../../../../core/server/services/offers');
const servicePath = require.resolve('../../../../../core/server/services/offers/service');

const TIER_ID = '0000000000000000000000b1';
const ACTIVE_ID = '0000000000000000000000c1';
const ARCHIVED_ID = '0000000000000000000000c2';
const BROKEN_ID = '0000000000000000000000c3';

function offerRow(json: Record<string, unknown>) {
  return {
    toJSON: () => ({
      name: `Offer ${json.code}`,
      portal_title: 'Title',
      portal_description: null,
      discount_type: 'percent',
      discount_amount: 10,
      interval: 'month',
      currency: null,
      duration: 'once',
      duration_in_months: null,
      stripe_coupon_id: null,
      redemption_type: 'signup',
      active: true,
      product: { id: TIER_ID, name: 'Gold' },
      created_at: new Date('2030-01-01T00:00:00Z'),
      ...json,
    }),
  };
}

const activeRow = offerRow({ id: ACTIVE_ID, code: 'active-code' });
const archivedRow = offerRow({ id: ARCHIVED_ID, code: 'archived-code', active: false });
// A signup offer without a tier fails domain validation, so the repository drops it.
const brokenRow = offerRow({ id: BROKEN_ID, code: 'broken-code', product: null });

function fakeOfferModel(rows: unknown[]) {
  return {
    findAll: sinon.stub().resolves(rows),
    findOne: sinon.stub().resolves(null),
    add: sinon.stub().resolves(),
    edit: sinon.stub().resolves(),
    transaction: sinon.stub().callsFake(async (cb: (trx: unknown) => Promise<unknown>) => {
      return cb({ executionPromise: Promise.resolve() });
    }),
  };
}

function fakeOfferRedemptionModel() {
  return {
    where: sinon.stub().returns({
      count: sinon.stub().resolves(0),
      orderBy: sinon.stub().returns({ fetch: sinon.stub().resolves(null) }),
    }),
  };
}

describe('Offers service root', function () {
  const sandbox = sinon.createSandbox();
  const cached = new Map<string, NodeJS.Module | undefined>();
  // Stands in for the process-wide event bus so listeners from these cases do not outlive them.
  let bus: EventEmitter;
  let subscribe: sinon.SinonStub;
  let OfferModel: ReturnType<typeof fakeOfferModel>;

  function forget(path: string) {
    if (!cached.has(path)) {
      cached.set(path, require.cache[path]);
    }
    delete require.cache[path];
  }

  /** A root with no state from earlier cases, as boot first sees it. */
  function loadRoot() {
    forget(rootPath);
    forget(servicePath);
    return require(rootPath);
  }

  function siteFor(middleware: express.RequestHandler) {
    const app = express();
    app.use(middleware);
    app.use((_req, res) => {
      res.sendStatus(404);
    });
    return app;
  }

  beforeEach(function () {
    bus = new EventEmitter();
    subscribe = sandbox.stub(DomainEvents, 'subscribe').callsFake((Event, handler) => {
      bus.on((Event as { name: string }).name, handler as (event: unknown) => void);
    });
    sandbox.stub(DomainEvents, 'dispatch').callsFake((event) => {
      bus.emit((event as object).constructor.name, event);
    });
    OfferModel = fakeOfferModel([activeRow, archivedRow, brokenRow]);
    sandbox.stub(models, 'Offer').value(OfferModel);
    sandbox.stub(models, 'OfferRedemption').value(fakeOfferRedemptionModel());
    sandbox.stub(logging, 'error');
    sandbox.stub(sentry, 'captureException');
  });

  afterEach(async function () {
    sandbox.restore();
    await configUtils.restore();
    for (const [path, module] of cached) {
      delete require.cache[path];
      if (module) {
        require.cache[path] = module;
      }
    }
    cached.clear();
  });

  it('exposes init, a null API and a middleware getter that throws before init', function () {
    const offers = loadRoot();

    assert.equal(typeof offers.init, 'function');
    assert.equal(offers.api, null);
    // There is no redirect manager to read until init builds one.
    assert.throws(() => offers.middleware, TypeError);
    sinon.assert.notCalled(OfferModel.findAll);
    sinon.assert.notCalled(subscribe);
  });

  it('publishes the API before the initial offers load and serves redirects once it settles', async function () {
    let finishLoad!: (rows: unknown[]) => void;
    OfferModel.findAll.returns(
      new Promise((resolve) => {
        finishLoad = resolve;
      }),
    );
    const offers = loadRoot();

    const initializing = offers.init();

    assert.ok(offers.api instanceof OffersAPI);
    sinon.assert.calledTwice(subscribe);
    const app = siteFor(offers.middleware);
    await request(app).get('/active-code').expect(404);

    finishLoad([activeRow]);
    await initializing;

    await request(app)
      .get('/active-code')
      .expect(302)
      .expect('Location', `/#/portal/offers/${ACTIVE_ID}`);
  });

  it('redirects every loaded offer code, active or archived, to its Portal offer', async function () {
    const offers = loadRoot();

    await offers.init();

    sinon.assert.calledOnce(OfferModel.findAll);
    const [options] = OfferModel.findAll.firstCall.args;
    assert.equal(options.filter, undefined);
    assert.deepEqual(options.withRelated, ['product']);
    assert.equal(typeof options.mongoTransformer, 'function');

    const app = siteFor(offers.middleware);
    await request(app)
      .get('/active-code')
      .expect(302)
      .expect('Location', `/#/portal/offers/${ACTIVE_ID}`)
      .expect('Cache-Control', 'public, max-age=0');
    await request(app)
      .get('/archived-code/')
      .expect(302)
      .expect('Location', `/#/portal/offers/${ARCHIVED_ID}`);
    await request(app)
      .get('/active-code?ref=newsletter')
      .expect(302)
      .expect('Location', `/?ref=newsletter#/portal/offers/${ACTIVE_ID}`);
    await request(app).get('/unknown-code').expect(404);
  });

  it('drops an offer row that fails domain validation, logging and reporting the error', async function () {
    const offers = loadRoot();

    await offers.init();

    await request(siteFor(offers.middleware)).get('/broken-code').expect(404);
    sinon.assert.calledOnce(logging.error);
    sinon.assert.calledOnce(sentry.captureException);
    const [error] = logging.error.firstCall.args;
    assert.match(error.message, /Signup offers must be associated with a tier/);
    sinon.assert.calledWithExactly(sentry.captureException, error);
  });

  it('reads the subdirectory for each redirect rather than at init', async function () {
    const offers = loadRoot();
    await offers.init();
    const app = siteFor(offers.middleware);

    configUtils.set('url', 'http://example.com/blog/');

    await request(app)
      .get('/active-code')
      .expect(302)
      .expect('Location', `/blog/#/portal/offers/${ACTIVE_ID}`);
  });

  it('adds and moves redirects as offers are created and their codes change', async function () {
    const offers = loadRoot();
    await offers.init();
    const app = siteFor(offers.middleware);

    const created = await offers.api.createOffer({
      name: 'Spring',
      code: 'spring',
      display_title: 'Spring sale',
      display_description: '',
      type: 'percent',
      amount: 20,
      cadence: 'month',
      currency: null,
      duration: 'once',
      redemption_type: 'signup',
      status: 'active',
      tier: { id: TIER_ID },
    });
    await setImmediate();

    sinon.assert.calledOnce(OfferModel.transaction);
    sinon.assert.calledOnce(OfferModel.add);
    await request(app)
      .get('/spring')
      .expect(302)
      .expect('Location', `/#/portal/offers/${created.id}`);

    DomainEvents.dispatch(
      OfferCodeChangeEvent.create({
        offerId: created.id,
        previousCode: { value: 'spring' },
        currentCode: { value: 'summer' },
      }),
    );

    await request(app).get('/spring').expect(404);
    await request(app)
      .get('/summer')
      .expect(302)
      .expect('Location', `/#/portal/offers/${created.id}`);

    DomainEvents.dispatch(
      OfferCodeChangeEvent.create({
        offerId: ACTIVE_ID,
        previousCode: null,
        currentCode: { value: 'extra-code' },
      }),
    );

    await request(app).get('/active-code').expect(302);
    await request(app)
      .get('/extra-code')
      .expect(302)
      .expect('Location', `/#/portal/offers/${ACTIVE_ID}`);
  });

  it('rejects when the initial load fails, leaving the API published and its listeners subscribed', async function () {
    const failure = new Error('offers load failed');
    OfferModel.findAll.rejects(failure);
    const offers = loadRoot();

    await assert.rejects(offers.init(), (error) => error === failure);

    assert.ok(offers.api instanceof OffersAPI);
    sinon.assert.calledTwice(subscribe);
    await request(siteFor(offers.middleware)).get('/active-code').expect(404);
  });

  it('rebuilds the API and redirects on every init, subscribing its listeners again', async function () {
    const offers = loadRoot();
    await offers.init();
    const firstApi = offers.api;
    const firstMiddleware = offers.middleware;

    await offers.init();

    // Incidental today: each init builds a new graph and subscribes it alongside the old one.
    // Boot runs init once per process; the e2e lane reboots in one process and accumulates them.
    assert.notEqual(offers.api, firstApi);
    assert.notEqual(offers.middleware, firstMiddleware);
    sinon.assert.calledTwice(OfferModel.findAll);
    assert.equal(subscribe.callCount, 4);
    assert.deepEqual(
      subscribe.getCalls().map((call) => call.args[0]),
      [OfferCodeChangeEvent, OfferCreatedEvent, OfferCodeChangeEvent, OfferCreatedEvent],
    );

    // A middleware captured before the second init still follows offer events.
    DomainEvents.dispatch(
      OfferCreatedEvent.create({ offer: { id: 'later-id', code: { value: 'later' } } }),
    );

    for (const middleware of [firstMiddleware, offers.middleware]) {
      await request(siteFor(middleware))
        .get('/later')
        .expect(302)
        .expect('Location', '/#/portal/offers/later-id');
    }
  });
});
