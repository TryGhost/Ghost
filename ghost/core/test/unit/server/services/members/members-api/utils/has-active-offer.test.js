const assert = require('node:assert/strict');
const sinon = require('sinon');
const hasActiveOffer = require('../../../../../../../core/server/services/members/members-api/utils/has-active-offer');

describe('hasActiveOffer', function () {
    beforeEach(function () {
        sinon.useFakeTimers(new Date('2025-05-15T00:00:00.000Z'));
    });

    afterEach(function () {
        sinon.restore();
    });

    function createSubscriptionModel({
        discountStart = null,
        discountEnd = null,
        trialEndAt = null,
        offerId = null,
        startDate = null,
        currentPeriodEnd = new Date('2025-06-01T00:00:00.000Z')
    } = {}) {
        return {
            get: sinon.stub().callsFake((key) => {
                const values = {
                    discount_start: discountStart,
                    discount_end: discountEnd,
                    trial_end_at: trialEndAt,
                    offer_id: offerId,
                    start_date: startDate,
                    current_period_end: currentPeriodEnd
                };

                return values[key] ?? null;
            })
        };
    }

    function createOffersAPI(offer = null) {
        return {
            getOffer: sinon.stub().resolves(offer)
        };
    }

    function createOffer(overrides = {}) {
        return {
            duration: 'once',
            duration_in_months: null,
            redemption_type: 'signup',
            ...overrides
        };
    }

    it('returns false when there is no trial and no offer', async function () {
        const model = createSubscriptionModel();

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, false);
    });

    it('returns true when trial_end_at is in the future', async function () {
        const model = createSubscriptionModel({
            trialEndAt: new Date('2025-05-22T00:00:00.000Z')
        });

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, true);
    });

    it('returns false when trial_end_at is in the past', async function () {
        const model = createSubscriptionModel({
            trialEndAt: new Date('2025-05-01T00:00:00.000Z')
        });

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, false);
    });

    it('returns true for a synced forever offer that still affects the next payment', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            discountStart: new Date('2025-05-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'forever'}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns true for a synced repeating offer that still affects the next payment', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            discountStart: new Date('2025-05-01T00:00:00.000Z'),
            discountEnd: new Date('2025-08-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2025-06-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'repeating', duration_in_months: 3}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns false for a synced repeating offer that no longer affects the next payment', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            discountStart: new Date('2025-04-01T00:00:00.000Z'),
            discountEnd: new Date('2025-05-31T00:00:00.000Z'),
            currentPeriodEnd: new Date('2025-06-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'repeating', duration_in_months: 2}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    it('returns false for a synced one-month repeating signup offer that ends on the current billing date', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            startDate: new Date('2025-05-01T00:00:00.000Z'),
            discountStart: new Date('2025-05-01T00:00:00.000Z'),
            discountEnd: new Date('2025-06-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2025-06-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'repeating', duration_in_months: 1}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    it('returns true for a synced once offer before the current billing date', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            discountStart: new Date('2025-05-01T00:00:00.000Z'),
            discountEnd: null,
            currentPeriodEnd: new Date('2025-06-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'once'}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns true for a legacy forever offer', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            startDate: new Date('2025-01-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'forever'}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns false for a legacy once offer', async function () {
        const model = createSubscriptionModel({offerId: 'offer_123'});
        const offersAPI = createOffersAPI(createOffer({duration: 'once'}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    it('returns true for a legacy repeating offer still within duration', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            startDate: new Date('2025-04-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2025-06-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'repeating', duration_in_months: 3}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns false for a legacy repeating offer past its duration', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            startDate: new Date('2025-01-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2025-06-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'repeating', duration_in_months: 3}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    it('returns false for retention offers without discount dates (no legacy support)', async function () {
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            startDate: new Date('2025-04-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2025-06-01T00:00:00.000Z')
        });
        const offersAPI = createOffersAPI(createOffer({duration: 'repeating', duration_in_months: 3, redemption_type: 'retention'}));

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    it('returns true when offer lookup throws', async function () {
        const model = createSubscriptionModel({offerId: 'offer_123'});
        const offersAPI = {
            getOffer: sinon.stub().rejects(new Error('Database error'))
        };

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns false when offer lookup returns null', async function () {
        const model = createSubscriptionModel({offerId: 'offer_123'});

        const result = await hasActiveOffer(model, createOffersAPI(null));

        assert.equal(result, false);
    });
});
