const sinon = require('sinon');
const assert = require('node:assert/strict');
const ObjectID = require('bson-objectid').default;
const OffersAPI = require('../../../../../../core/server/services/offers/application/offers-api');

/**
 * @typedef {import('../../../../../../core/server/services/offers/offer-bookshelf-repository')} OfferBookshelfRepository
 */

function createMockRepository(overrides = {}) {
    const mockTransaction = {id: 'mock-tx'};

    return {
        createTransaction: sinon.stub().callsFake(async (cb) => {
            return cb(mockTransaction);
        }),
        getByStripeCouponId: sinon.stub().resolves(null),
        getRedeemedOfferIdsForSubscriptions: sinon.stub().resolves([]),
        existsByCode: sinon.stub().resolves(false),
        existsByName: sinon.stub().resolves(false),
        save: sinon.stub().resolves(),
        ...overrides
    };
}

function createMockOffer(id, {
    tierId,
    tierName = 'Test Tier',
    cadence = 'month',
    type = 'percent',
    status = 'active',
    redemptionType = 'signup'
} = {}) {
    return {
        id,
        name: {value: 'Test Offer'},
        code: {value: 'test-code'},
        displayTitle: {value: 'Test Title'},
        displayDescription: {value: 'Test Description'},
        type: {value: type},
        cadence: {value: cadence},
        amount: {value: 10},
        duration: {value: {type: 'once', months: null}},
        currency: {value: null},
        status: {value: status},
        redemptionType: {value: redemptionType},
        redemptionCount: 0,
        tier: tierId === null ? null : {id: tierId || id, name: tierName},
        createdAt: new Date().toISOString(),
        lastRedeemed: null
    };
}

function createMockCoupon(id) {
    return {
        id,
        percent_off: 10,
        duration: 'once'
    };
}

describe('OffersAPI', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('#listOffersAvailableToSubscription', function () {
        it('returns offers matching tier, cadence, and redemption type', async function () {
            const tierId = new ObjectID().toHexString();
            const offers = [
                createMockOffer('offer-1', {tierId, cadence: 'month', redemptionType: 'retention'}),
                createMockOffer('offer-2', {tierId, cadence: 'month', redemptionType: 'signup'}),
                createMockOffer('offer-3', {tierId, cadence: 'year', redemptionType: 'retention'})
            ];

            const repository = createMockRepository({
                getAll: sinon.stub().resolves(offers),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month',
                redemptionType: 'retention'
            });

            assert.equal(result.length, 1);
            assert.equal(result[0].id, 'offer-1');
        });

        it('excludes trial offers', async function () {
            const tierId = new ObjectID().toHexString();
            const offers = [
                createMockOffer('offer-1', {tierId, cadence: 'month', type: 'percent', redemptionType: 'retention'}),
                createMockOffer('offer-2', {tierId, cadence: 'month', type: 'trial', redemptionType: 'retention'})
            ];

            const repository = createMockRepository({
                getAll: sinon.stub().resolves(offers),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month',
                redemptionType: 'retention'
            });

            assert.equal(result.length, 1);
            assert.equal(result[0].id, 'offer-1');
        });

        it('excludes already redeemed offers', async function () {
            const tierId = new ObjectID().toHexString();
            const offers = [
                createMockOffer('offer-1', {tierId, cadence: 'month', redemptionType: 'retention'}),
                createMockOffer('offer-2', {tierId, cadence: 'month', redemptionType: 'retention'})
            ];

            const repository = createMockRepository({
                getAll: sinon.stub().resolves(offers),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves(['offer-1'])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month',
                redemptionType: 'retention'
            });

            assert.equal(result.length, 1);
            assert.equal(result[0].id, 'offer-2');
        });

        it('excludes inactive offers', async function () {
            const tierId = new ObjectID().toHexString();
            const activeOffer = createMockOffer('offer-1', {tierId, cadence: 'month', status: 'active', redemptionType: 'retention'});

            const repository = createMockRepository({
                // Emulate real repository behavior: getAll with filter 'status:active' returns only active offers
                getAll: sinon.stub().resolves([activeOffer]),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month',
                redemptionType: 'retention'
            });

            // Verify getAll was called with status:active filter
            assert(repository.getAll.calledOnce);
            assert.equal(repository.getAll.firstCall.args[0].filter, 'status:active');

            // Only active offer returned
            assert.equal(result.length, 1);
            assert.equal(result[0].id, 'offer-1');
        });

        it('returns empty array when no offers match', async function () {
            const tierId = new ObjectID().toHexString();
            const differentTierId = new ObjectID().toHexString();
            const offers = [
                createMockOffer('offer-1', {tierId: differentTierId, cadence: 'month', redemptionType: 'retention'})
            ];

            const repository = createMockRepository({
                getAll: sinon.stub().resolves(offers),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month',
                redemptionType: 'retention'
            });

            assert.equal(result.length, 0);
        });

        it('returns all redemption types when redemptionType is not specified', async function () {
            const tierId = new ObjectID().toHexString();
            const offers = [
                createMockOffer('offer-1', {tierId, cadence: 'month', redemptionType: 'signup'}),
                createMockOffer('offer-2', {tierId, cadence: 'month', redemptionType: 'retention'})
            ];

            const repository = createMockRepository({
                getAll: sinon.stub().resolves(offers),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month'
                // no redemptionType specified
            });

            assert.equal(result.length, 2);
        });

        it('matches null-tier retention offer to any tier with correct cadence', async function () {
            const tierId = new ObjectID().toHexString();
            const offers = [
                createMockOffer('offer-1', {tierId: null, cadence: 'month', redemptionType: 'retention'})
            ];

            const repository = createMockRepository({
                getAll: sinon.stub().resolves(offers),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month',
                redemptionType: 'retention'
            });

            assert.equal(result.length, 1);
            assert.equal(result[0].id, 'offer-1');
        });

        it('does not match null-tier retention offer when cadence differs', async function () {
            const tierId = new ObjectID().toHexString();
            const offers = [
                createMockOffer('offer-1', {tierId: null, cadence: 'year', redemptionType: 'retention'})
            ];

            const repository = createMockRepository({
                getAll: sinon.stub().resolves(offers),
                getRedeemedOfferIdsForSubscription: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.listOffersAvailableToSubscription({
                subscriptionId: 'sub_123',
                tierId,
                cadence: 'month',
                redemptionType: 'retention'
            });

            assert.equal(result.length, 0);
        });

        it('throws error when required parameters are missing', async function () {
            const repository = createMockRepository({});
            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            await assert.rejects(
                api.listOffersAvailableToSubscription({
                    subscriptionId: 'sub_123',
                    tierId: 'tier_123'
                    // missing cadence
                }),
                /subscriptionId, tierId, and cadence are required/
            );

            await assert.rejects(
                api.listOffersAvailableToSubscription({
                    subscriptionId: 'sub_123',
                    cadence: 'month'
                    // missing tierId
                }),
                /subscriptionId, tierId, and cadence are required/
            );

            await assert.rejects(
                api.listOffersAvailableToSubscription({
                    tierId: 'tier_123',
                    cadence: 'month'
                    // missing subscriptionId
                }),
                /subscriptionId, tierId, and cadence are required/
            );
        });
    });

    describe('#getRedeemedOfferIdsForSubscriptions', function () {
        it('returns redemptions for multiple subscriptions', async function () {
            const redemptions = [
                {subscription_id: 'sub_1', offer_id: 'offer-a'},
                {subscription_id: 'sub_2', offer_id: 'offer-b'},
                {subscription_id: 'sub_2', offer_id: 'offer-c'}
            ];
            const repository = createMockRepository({
                getRedeemedOfferIdsForSubscriptions: sinon.stub().resolves(redemptions)
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.getRedeemedOfferIdsForSubscriptions({
                subscriptionIds: ['sub_1', 'sub_2']
            });

            assert.deepEqual(result, redemptions);
            assert.equal(repository.getRedeemedOfferIdsForSubscriptions.calledOnce, true);
        });

        it('returns empty array for empty input', async function () {
            const repository = createMockRepository({
                getRedeemedOfferIdsForSubscriptions: sinon.stub().resolves([])
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));

            const result = await api.getRedeemedOfferIdsForSubscriptions({
                subscriptionIds: []
            });

            assert.deepEqual(result, []);
            // Should short-circuit without hitting the repository
            assert.equal(repository.getRedeemedOfferIdsForSubscriptions.called, false);
        });
    });

    describe('#ensureOfferForStripeCoupon', function () {
        it('returns existing offer if found by stripe coupon id', async function () {
            const existingOffer = createMockOffer('existing-offer-id');
            const repository = createMockRepository({
                getByStripeCouponId: sinon.stub().resolves(existingOffer)
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_123');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            const result = await api.ensureOfferForStripeCoupon(coupon, 'month', tier);

            assert.equal(result.id, 'existing-offer-id');
            assert.equal(repository.save.called, false);
        });

        it('creates new offer if none exists for stripe coupon id', async function () {
            const repository = createMockRepository({
                getByStripeCouponId: sinon.stub().resolves(null),
                existsByCode: sinon.stub().resolves(false),
                existsByName: sinon.stub().resolves(false)
            });
            repository.save.resolves();

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_456');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            const result = await api.ensureOfferForStripeCoupon(coupon, 'month', tier);

            assert.equal(repository.save.calledOnce, true);
            assert.ok(result.id);
            assert.equal(result.code, coupon.id);
        });

        it('handles race condition with ER_DUP_ENTRY by returning existing offer', async function () {
            const existingOffer = createMockOffer('race-winner-offer-id');
            const getByStripeCouponIdStub = sinon.stub();

            // First call returns null (offer doesn't exist yet)
            // Second call (after ER_DUP_ENTRY) returns the offer created by another request
            getByStripeCouponIdStub.onFirstCall().resolves(null);
            getByStripeCouponIdStub.onSecondCall().resolves(existingOffer);

            const repository = createMockRepository({
                getByStripeCouponId: getByStripeCouponIdStub,
                existsByCode: sinon.stub().resolves(false),
                existsByName: sinon.stub().resolves(false)
            });

            // Simulate duplicate entry error (MySQL)
            repository.save.rejects({code: 'ER_DUP_ENTRY'});

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_race');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            const result = await api.ensureOfferForStripeCoupon(coupon, 'month', tier);

            assert.equal(result.id, 'race-winner-offer-id');
            assert.equal(getByStripeCouponIdStub.calledTwice, true);
            assert.equal(repository.save.calledOnce, true);
        });

        it('handles race condition with SQLITE_CONSTRAINT by returning existing offer', async function () {
            const existingOffer = createMockOffer('race-winner-offer-id');
            const getByStripeCouponIdStub = sinon.stub();

            // First call returns null, second call returns the offer
            getByStripeCouponIdStub.onFirstCall().resolves(null);
            getByStripeCouponIdStub.onSecondCall().resolves(existingOffer);

            const repository = createMockRepository({
                getByStripeCouponId: getByStripeCouponIdStub,
                existsByCode: sinon.stub().resolves(false),
                existsByName: sinon.stub().resolves(false)
            });

            // Simulate constraint error (SQLite)
            repository.save.rejects({code: 'SQLITE_CONSTRAINT'});

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_race');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            const result = await api.ensureOfferForStripeCoupon(coupon, 'month', tier);

            assert.equal(result.id, 'race-winner-offer-id');
            assert.equal(getByStripeCouponIdStub.calledTwice, true);
        });

        it('throws readable error when duplicate entry occurs but offer not found', async function () {
            const getByStripeCouponIdStub = sinon.stub();
            // First call returns null (offer doesn't exist)
            // Second call (after ER_DUP_ENTRY) also returns null (unexpected!)
            getByStripeCouponIdStub.onFirstCall().resolves(null);
            getByStripeCouponIdStub.onSecondCall().resolves(null);

            const repository = createMockRepository({
                getByStripeCouponId: getByStripeCouponIdStub,
                existsByCode: sinon.stub().resolves(false),
                existsByName: sinon.stub().resolves(false)
            });

            // Simulate duplicate entry error
            const dupError = new Error('Duplicate entry');
            dupError.code = 'ER_DUP_ENTRY';
            repository.save.rejects(dupError);

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_missing');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            try {
                await api.ensureOfferForStripeCoupon(coupon, 'month', tier);
                assert.fail('Expected InternalServerError to be thrown');
            } catch (err) {
                // Should throw InternalServerError with readable message
                assert.equal(err.constructor.name, 'InternalServerError');
                assert.match(err.message, /Tried to create duplicate offer for the Stripe coupon/);
                assert.match(err.message, /coupon_missing/);

                // Should have checked twice for the offer
                assert.equal(getByStripeCouponIdStub.calledTwice, true);
            }
        });

        it('throws non-duplicate errors without retry', async function () {
            const repository = createMockRepository({
                getByStripeCouponId: sinon.stub().resolves(null),
                existsByCode: sinon.stub().resolves(false),
                existsByName: sinon.stub().resolves(false)
            });

            repository.save.rejects({code: 'ER_SOME_OTHER_ERROR', message: 'Some other database error'});

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_error');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            try {
                await api.ensureOfferForStripeCoupon(coupon, 'month', tier);
                assert.fail('Expected error to be thrown');
            } catch (err) {
                assert.equal(err.code, 'ER_SOME_OTHER_ERROR');
            }

            // Should not retry lookup on non-duplicate errors
            assert.equal(repository.getByStripeCouponId.calledOnce, true);
        });

        it('reuses existing transaction if provided in options', async function () {
            const existingOffer = createMockOffer('existing-offer-id');
            const existingTransaction = {id: 'existing-tx'};

            const repository = createMockRepository({
                getByStripeCouponId: sinon.stub().resolves(existingOffer)
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_tx');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            await api.ensureOfferForStripeCoupon(coupon, 'month', tier, {transacting: existingTransaction});

            // Should not create a new transaction
            assert.equal(repository.createTransaction.called, false);
            // Should use the provided transaction
            const callOptions = repository.getByStripeCouponId.firstCall.args[1];
            assert.equal(callOptions.transacting, existingTransaction);
        });

        it('creates new transaction if none provided in options', async function () {
            const existingOffer = createMockOffer('existing-offer-id');

            const repository = createMockRepository({
                getByStripeCouponId: sinon.stub().resolves(existingOffer)
            });

            const api = new OffersAPI(/** @type {OfferBookshelfRepository} */ (/** @type {unknown} */ (repository)));
            const coupon = createMockCoupon('coupon_new_tx');
            const tier = {id: new ObjectID().toHexString(), name: 'Test Tier'};

            await api.ensureOfferForStripeCoupon(coupon, 'month', tier);

            // Should create a new transaction
            assert.equal(repository.createTransaction.calledOnce, true);
        });
    });
});
