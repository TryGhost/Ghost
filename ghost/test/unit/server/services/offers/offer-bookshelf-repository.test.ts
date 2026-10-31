import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';

const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');
const sentry = require('../../../../../core/shared/sentry');
const OfferBookshelfRepository = require('../../../../../core/server/services/offers/offer-bookshelf-repository');
const Offer = require('../../../../../core/server/services/offers/domain/models/offer');
const OfferCreatedEvent = require('../../../../../core/server/services/offers/domain/events/offer-created-event');
const OfferCodeChangeEvent = require('../../../../../core/server/services/offers/domain/events/offer-code-change-event');
const OfferCode = require('../../../../../core/server/services/offers/domain/models/offer-code');

const TIER_ID = '0000000000000000000000b1';
const OFFER_ID = '0000000000000000000000c1';

const uniqueChecker = {
  isUniqueCode: async () => true,
  isUniqueName: async () => true,
};

function newOffer() {
  return Offer.create(
    {
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
    },
    uniqueChecker,
  );
}

function fakeOfferModel() {
  return {
    findAll: sinon.stub().resolves([]),
    add: sinon.stub().resolves(),
    edit: sinon.stub().resolves(),
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

describe('OfferBookshelfRepository', function () {
  let dispatch: sinon.SinonStub;

  beforeEach(function () {
    dispatch = sinon.stub(DomainEvents, 'dispatch');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('save', function () {
    it('adds a new offer and dispatches its events at once outside a transaction', async function () {
      const OfferModel = fakeOfferModel();
      const repository = new OfferBookshelfRepository(OfferModel, fakeOfferRedemptionModel());
      const offer = await newOffer();
      const options = { context: { internal: true } };

      await repository.save(offer, options);

      sinon.assert.calledOnce(OfferModel.add);
      sinon.assert.notCalled(OfferModel.edit);
      const [data, addOptions] = OfferModel.add.firstCall.args;
      assert.equal(addOptions, options);
      assert.equal(data.id, offer.id);
      assert.equal(data.code, 'spring');
      assert.equal(data.discount_type, 'percent');
      assert.equal(data.product_id, TIER_ID);
      assert.equal(data.active, true);
      sinon.assert.calledOnce(dispatch);
      const [event] = dispatch.firstCall.args;
      assert.ok(event instanceof OfferCreatedEvent);
      assert.equal(event.data.offer, offer);
    });

    it('edits an existing offer by id and dispatches each pending event', async function () {
      const OfferModel = fakeOfferModel();
      const repository = new OfferBookshelfRepository(OfferModel, fakeOfferRedemptionModel());
      const offer = await Offer.create(
        {
          id: OFFER_ID,
          name: 'Spring',
          code: 'spring',
          display_title: 'Spring sale',
          type: 'percent',
          amount: 20,
          cadence: 'month',
          duration: 'once',
          redemption_type: 'signup',
          status: 'active',
          tier: { id: TIER_ID },
          created_at: new Date('2030-01-01T00:00:00Z'),
        },
        null,
      );
      await offer.updateCode(OfferCode.create('summer'), uniqueChecker);

      await repository.save(offer, {});

      sinon.assert.notCalled(OfferModel.add);
      sinon.assert.calledOnce(OfferModel.edit);
      const [data, editOptions] = OfferModel.edit.firstCall.args;
      assert.equal(data.code, 'summer');
      assert.equal(editOptions.id, OFFER_ID);
      sinon.assert.calledOnce(dispatch);
      assert.ok(dispatch.firstCall.args[0] instanceof OfferCodeChangeEvent);
    });

    it('dispatches events only once the supplied transaction completes', async function () {
      const repository = new OfferBookshelfRepository(fakeOfferModel(), fakeOfferRedemptionModel());
      const offer = await newOffer();
      let commit!: () => void;
      const executionPromise = new Promise<void>((resolve) => {
        commit = resolve;
      });

      await repository.save(offer, { transacting: { executionPromise } });
      await setImmediate();

      sinon.assert.notCalled(dispatch);

      commit();
      await setImmediate();

      sinon.assert.calledOnce(dispatch);
      assert.ok(dispatch.firstCall.args[0] instanceof OfferCreatedEvent);
    });

    it('waits on a rolled-back transaction with no rejection handler of its own', async function () {
      const repository = new OfferBookshelfRepository(fakeOfferModel(), fakeOfferRedemptionModel());
      const offer = await newOffer();
      // A real rolled-back transaction rejects this promise. Save chains only a fulfilment
      // handler, so that rejection surfaces as an unhandled rejection; a stub keeps it out of
      // the test run while pinning that no handler is attached.
      const executionPromise = { then: sinon.stub().returns(new Promise(() => {})) };

      await repository.save(offer, { transacting: { executionPromise } });

      sinon.assert.calledOnce(executionPromise.then);
      assert.equal(executionPromise.then.firstCall.args.length, 1);
      sinon.assert.notCalled(dispatch);
    });
  });

  describe('reading offers', function () {
    it('logs and reports a row that fails domain validation, returning null for it', async function () {
      const error = sinon.stub(logging, 'error');
      const captureException = sinon.stub(sentry, 'captureException');
      const OfferModel = {
        findOne: sinon.stub().resolves({
          toJSON: () => ({
            id: OFFER_ID,
            name: 'Broken',
            code: 'broken',
            discount_type: 'percent',
            discount_amount: 10,
            interval: 'month',
            duration: 'once',
            redemption_type: 'signup',
            active: true,
            product: null,
            created_at: new Date('2030-01-01T00:00:00Z'),
          }),
        }),
      };
      const repository = new OfferBookshelfRepository(OfferModel, fakeOfferRedemptionModel());

      const offer = await repository.getById(OFFER_ID, {});

      assert.equal(offer, null);
      sinon.assert.calledOnce(error);
      sinon.assert.calledOnce(captureException);
      const [failure] = error.firstCall.args;
      assert.match(failure.message, /Signup offers must be associated with a tier/);
      sinon.assert.calledWithExactly(captureException, failure);
    });

    it('lists through a query transform that keeps status and redemption type, mapping status to active', async function () {
      const OfferModel = fakeOfferModel();
      const repository = new OfferBookshelfRepository(OfferModel, fakeOfferRedemptionModel());

      await repository.getAll({ filter: 'status:active' });

      const [{ mongoTransformer }] = OfferModel.findAll.firstCall.args;
      assert.deepEqual(
        mongoTransformer({
          $and: [{ status: 'active' }, { redemption_type: 'retention' }, { name: 'Spring' }],
        }),
        { $and: [{ active: true }, { redemption_type: 'retention' }] },
      );
      assert.deepEqual(mongoTransformer({ status: 'archived' }), { active: false });
      assert.deepEqual(mongoTransformer({ active: true }), {});
    });
  });
});
