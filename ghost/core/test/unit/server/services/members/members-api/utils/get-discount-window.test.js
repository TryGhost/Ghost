const assert = require('node:assert/strict');
const getDiscountWindow = require('../../../../../../../core/server/services/members/members-api/utils/get-discount-window');

describe('getDiscountWindow', function () {
    function createSubscription(overrides = {}) {
        return {
            discount_start: null,
            discount_end: null,
            start_date: new Date('2025-01-01T00:00:00.000Z'),
            ...overrides
        };
    }

    // Stripe coupon discount (post-6.16 data)

    describe('stripe coupon discount', function () {
        it('returns window when discount_start is present with discount_end', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const discountEnd = new Date('2025-11-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: discountEnd
            });

            const result = getDiscountWindow(subscription, null);

            assert.deepEqual(result, {start: discountStart, end: discountEnd});
        });

        it('returns window with null end for forever discounts', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: null
            });

            const result = getDiscountWindow(subscription, null);

            assert.deepEqual(result, {start: discountStart, end: null});
        });

        it('returns window even when discount_end is in the past (trusts Stripe data)', function () {
            const discountStart = new Date('2025-01-01T00:00:00.000Z');
            const discountEnd = new Date('2025-06-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: discountEnd
            });

            const result = getDiscountWindow(subscription, null);

            assert.deepEqual(result, {start: discountStart, end: discountEnd});
        });

        it('discount_start takes precedence over legacy offer data', function () {
            const discountStart = new Date('2025-05-01T00:00:00.000Z');
            const subscription = createSubscription({
                discount_start: discountStart,
                discount_end: null
            });

            const result = getDiscountWindow(subscription, {duration: 'once'});

            assert.deepEqual(result, {start: discountStart, end: null});
        });
    });

    // Legacy fallback (no discount_start, uses offer duration)

    describe('legacy fallback', function () {
        it('returns null when no offer is provided', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, null);

            assert.equal(result, null);
        });

        it('returns null for once duration', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, {duration: 'once'});

            assert.equal(result, null);
        });

        it('returns window with null end for forever duration', function () {
            const startDate = new Date('2025-01-01T00:00:00.000Z');
            const subscription = createSubscription({start_date: startDate});

            const result = getDiscountWindow(subscription, {duration: 'forever'});

            assert.deepEqual(result, {start: startDate, end: null});
        });

        it('returns window for repeating offer still within duration', function () {
            const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 3 months ago
            const subscription = createSubscription({start_date: startDate});

            const result = getDiscountWindow(subscription, {duration: 'repeating', duration_in_months: 6});

            assert.notEqual(result, null);
            assert.deepEqual(result.start, startDate);
            assert.ok(result.end instanceof Date);
            assert.ok(result.end > new Date());
        });

        it('returns null for repeating offer past its duration', function () {
            const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
            const subscription = createSubscription({start_date: startDate});

            const result = getDiscountWindow(subscription, {duration: 'repeating', duration_in_months: 6});

            assert.equal(result, null);
        });

        it('returns null for repeating offer with zero duration_in_months', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, {duration: 'repeating', duration_in_months: 0});

            assert.equal(result, null);
        });

        it('returns null for unknown duration', function () {
            const subscription = createSubscription();

            const result = getDiscountWindow(subscription, {duration: 'unknown'});

            assert.equal(result, null);
        });
    });
});
