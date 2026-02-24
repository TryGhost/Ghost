const assert = require('node:assert/strict');
const sinon = require('sinon');
const hasActiveOffer = require('../../../../../../../core/server/services/members/members-api/utils/has-active-offer');

describe('hasActiveOffer', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createSubscriptionModel({discountStart = null, discountEnd = null, trialEndAt = null, offerId = null, startDate = null} = {}) {
        return {
            get: sinon.stub().callsFake((key) => {
                const values = {
                    discount_start: discountStart,
                    discount_end: discountEnd,
                    trial_end_at: trialEndAt,
                    offer_id: offerId,
                    start_date: startDate
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

    // Post-6.16 data: discount_start is populated

    it('returns true when discount_start is set and discount_end is null (forever discount)', async function () {
        const model = createSubscriptionModel({
            discountStart: new Date('2026-01-01')
        });

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, true);
    });

    it('returns true when discount_start is set and discount_end is in the future', async function () {
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const model = createSubscriptionModel({
            discountStart: new Date('2026-01-01'),
            discountEnd: futureDate
        });

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, true);
    });

    it('returns false when discount_start is set and discount_end is in the past', async function () {
        const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const model = createSubscriptionModel({
            discountStart: new Date('2025-01-01'),
            discountEnd: pastDate
        });

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, false);
    });

    // Trial-based offers (trial)

    it('returns true when trial_end_at is in the future', async function () {
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const model = createSubscriptionModel({
            trialEndAt: futureDate
        });

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, true);
    });

    it('returns false when trial_end_at is in the past', async function () {
        const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const model = createSubscriptionModel({
            trialEndAt: pastDate
        });

        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, false);
    });

    // Legacy data: discount_start is null, fall back to offer duration lookup

    it('returns false when no discount_start, no trial, and no offer_id', async function () {
        const model = createSubscriptionModel();
        const result = await hasActiveOffer(model, createOffersAPI());
        assert.equal(result, false);
    });

    it('returns true for a forever offer (legacy data)', async function () {
        const model = createSubscriptionModel({offerId: 'offer_123'});
        const offersAPI = createOffersAPI({duration: 'forever'});
        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns false for a once offer (legacy data)', async function () {
        const model = createSubscriptionModel({offerId: 'offer_123'});
        const offersAPI = createOffersAPI({duration: 'once'});
        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    it('returns true for a repeating offer still within duration (legacy data)', async function () {
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            startDate: threeMonthsAgo
        });
        const offersAPI = createOffersAPI({duration: 'repeating', duration_in_months: 6});
        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns false for a repeating offer past its duration (legacy data)', async function () {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const model = createSubscriptionModel({
            offerId: 'offer_123',
            startDate: oneYearAgo
        });
        const offersAPI = createOffersAPI({duration: 'repeating', duration_in_months: 6});

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    it('returns true when offer lookup throws (errs on the side of blocking)', async function () {
        const model = createSubscriptionModel({offerId: 'offer_123'});
        const offersAPI = {
            getOffer: sinon.stub().rejects(new Error('Database error'))
        };

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, true);
    });

    it('returns false when offer lookup returns null (offer deleted)', async function () {
        const model = createSubscriptionModel({offerId: 'offer_123'});
        const offersAPI = createOffersAPI(null);

        const result = await hasActiveOffer(model, offersAPI);

        assert.equal(result, false);
    });

    // Priority: discount_start takes precedence over trial and legacy fallback

    it('discount_start takes precedence over trial_end_at', async function () {
        const pastDiscountEnd = new Date(Date.now() - 1000);
        const futureTrialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const model = createSubscriptionModel({
            discountStart: new Date('2025-01-01'),
            discountEnd: pastDiscountEnd,
            trialEndAt: futureTrialEnd
        });

        // discount_start is set, so discount_end in the past means expired
        // even though trial_end_at is in the future
        const result = await hasActiveOffer(model, createOffersAPI());

        assert.equal(result, false);
    });
});
