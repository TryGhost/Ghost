const assert = require('node:assert/strict');
const sinon = require('sinon');
const getDiscountWindow = require('../../../../../../../core/server/services/members/members-api/utils/get-discount-window');

/**
 * @typedef {import('../../../../../../../core/server/services/offers/application/offer-mapper').OfferDTO} OfferDTO
 */

describe('getDiscountWindow', function () {
    beforeEach(function () {
        sinon.useFakeTimers(new Date('2025-05-15T00:00:00.000Z'));
    });

    afterEach(function () {
        sinon.restore();
    });

    function createSubscription(overrides = {}) {
        return {
            discount_start: null,
            discount_end: null,
            start_date: new Date('2025-01-01T00:00:00.000Z'),
            current_period_end: new Date('2025-06-15T00:00:00.000Z'),
            plan: {
                interval: 'month'
            },
            ...overrides
        };
    }

    /**
     * @param {Partial<OfferDTO>} [overrides]
     * @returns {OfferDTO}
     */
    function createOffer(overrides = {}) {
        /** @type {OfferDTO} */
        const defaults = {
            id: 'offer_123',
            name: 'Test Offer',
            code: 'test-offer',
            display_title: 'Test Offer Title',
            display_description: 'Test offer description',
            type: 'percent',
            cadence: 'month',
            amount: 20,
            currency_restriction: false,
            currency: null,
            duration: 'once',
            duration_in_months: null,
            status: 'active',
            redemption_count: 0,
            redemption_type: 'signup',
            tier: {
                id: 'tier_123',
                name: 'Default Tier'
            },
            created_at: '2025-01-01T00:00:00.000Z',
            last_redeemed: null
        };

        if (overrides.type === 'fixed') {
            defaults.currency_restriction = true;
            defaults.currency = 'USD';
        }

        if (overrides.type === 'trial') {
            defaults.duration = 'trial';
            defaults.duration_in_months = null;
        }

        if (overrides.duration === 'repeating' && overrides.duration_in_months === undefined) {
            defaults.duration_in_months = 6;
        }

        return {
            ...defaults,
            ...overrides
        };
    }

    // Stripe coupon discount (post-6.16 data)

    describe('stripe coupon discount', function () {
        it('returns the last discounted billing date for repeating offers', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const discountEnd = new Date('2025-09-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: discountEnd
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 3}));

            assert.deepEqual(result, {
                start: discountStart,
                end: new Date('2025-08-15T00:00:00.000Z')
            });
        });

        it('preserves last-day-of-month billing anchors when deriving the last discounted billing date', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const discountEnd = new Date('2025-08-15T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: discountEnd,
                current_period_end: new Date('2025-05-31T00:00:00.000Z')
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 3}));

            assert.deepEqual(result, {
                start: discountStart,
                end: new Date('2025-07-31T00:00:00.000Z')
            });
        });

        it('preserves non-month-end billing anchors when crossing February', function () {
            const discountStart = new Date('2025-12-01T00:00:00.000Z');
            const discountEnd = new Date('2026-04-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: discountEnd,
                current_period_end: new Date('2026-01-30T00:00:00.000Z')
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 3}));

            assert.deepEqual(result, {
                start: discountStart,
                end: new Date('2026-03-30T00:00:00.000Z')
            });
        });

        it('returns window with null end for forever discounts', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: null
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'forever'}));

            assert.deepEqual(result, {start: discountStart, end: null});
        });

        it('returns current period end for once discounts', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const currentPeriodEnd = new Date('2025-06-15T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: null,
                current_period_end: currentPeriodEnd
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'once'}));

            assert.deepEqual(result, {
                start: discountStart,
                end: currentPeriodEnd
            });
        });

        it('returns null when discount_end expires before the next billing date', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const discountEnd = new Date('2025-06-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: discountEnd,
                current_period_end: new Date('2025-06-15T00:00:00.000Z')
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 1}));

            assert.equal(result, null);
        });

        it('returns null when discount_end matches the next billing date', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const discountEnd = new Date('2025-06-15T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: discountEnd,
                current_period_end: new Date('2025-06-15T00:00:00.000Z')
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 1}));

            assert.equal(result, null);
        });

        it('discount_start takes precedence over legacy offer data', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const currentPeriodEnd = new Date('2025-06-15T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: null,
                current_period_end: currentPeriodEnd
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'once'}));

            assert.deepEqual(result, {start: discountStart, end: currentPeriodEnd});
        });
    });

    // Legacy fallback (no discount_start, uses offer duration)

    describe('legacy fallback', function () {
        it('returns null for once duration', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, createOffer({duration: 'once'}));

            assert.equal(result, null);
        });

        it('returns null for retention offers without a discount start (no legacy fallback)', function () {
            const subscription = createSubscription({
                start_date: new Date('2025-04-01T00:00:00.000Z'),
                current_period_end: new Date('2025-06-01T00:00:00.000Z')
            });

            const result = getDiscountWindow(subscription, createOffer({
                duration: 'repeating',
                duration_in_months: 3,
                redemption_type: 'retention'
            }));

            assert.equal(result, null);
        });

        it('returns window with null end for forever duration', function () {
            const startDate = new Date('2025-01-01T00:00:00.000Z');
            const subscription = createSubscription({start_date: startDate});

            const result = getDiscountWindow(subscription, createOffer({duration: 'forever'}));

            assert.deepEqual(result, {start: startDate, end: null});
        });

        it('returns the last discounted billing date for legacy repeating offers', function () {
            const startDate = new Date('2025-04-01T00:00:00.000Z');
            const subscription = createSubscription({
                start_date: startDate,
                current_period_end: new Date('2025-06-01T00:00:00.000Z')
            });

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 3}));

            assert.deepEqual(result, {
                start: startDate,
                end: new Date('2025-06-01T00:00:00.000Z')
            });
        });

        it('returns window for repeating offer still within duration', function () {
            const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 3 months ago
            const subscription = createSubscription({start_date: startDate});

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 6}));

            assert.notEqual(result, null);
            assert.deepEqual(result.start, startDate);
            assert.ok(result.end instanceof Date);
            assert.ok(result.end > new Date());
        });

        it('returns null for repeating offer past its duration', function () {
            const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
            const subscription = createSubscription({start_date: startDate});

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 6}));

            assert.equal(result, null);
        });

        it('returns null for repeating offer with zero duration_in_months', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 0}));

            assert.equal(result, null);
        });

        it('returns null for non-signup offers without synced discount dates', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, createOffer({duration: 'repeating', duration_in_months: 3, redemption_type: 'retention'}));

            assert.equal(result, null);
        });

        it('returns null for unknown duration', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, createOffer({duration: 'unknown'}));

            assert.equal(result, null);
        });
    });
});
