const assert = require('node:assert/strict');
const NextPaymentCalculator = require('../../../../../../../core/server/services/members/members-api/services/next-payment-calculator');

/**
 * @typedef {import('../../../../../../../core/server/services/offers/application/offer-mapper').OfferDTO} OfferDTO
 */

describe('NextPaymentCalculator', function () {
    function createSubscription(overrides = {}, offer = null) {
        return {
            id: 'sub_123',
            status: 'active',
            plan: {
                amount: 500,
                interval: 'month',
                currency: 'USD'
            },
            start_date: new Date('2025-01-01T00:00:00.000Z'),
            discount_start: null,
            discount_end: null,
            current_period_end: new Date('2025-06-15T00:00:00.000Z'),
            offer,
            ...overrides
        };
    }

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

    describe('calculate', function () {
        it('returns null for cancelled subscriptions', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const subscription = createSubscription({status: 'canceled'});

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result, null);
        });

        it('returns null for incomplete subscriptions', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const subscription = createSubscription({status: 'incomplete'});

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result, null);
        });

        it('returns null for incomplete_expired subscriptions', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const subscription = createSubscription({status: 'incomplete_expired'});

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result, null);
        });

        it('returns original amount when no offer', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const subscription = createSubscription();

            const result = nextPaymentCalculator.calculate(subscription);

            assert.deepEqual(result, {
                original_amount: 500,
                amount: 500,
                interval: 'month',
                currency: 'USD',
                discount: null
            });
        });

        it('returns original amount for trial offers', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const offer = createOffer({type: 'trial', duration: 'trial', amount: 7});
            const subscription = createSubscription({
                discount_start: new Date('2025-05-01T00:00:00.000Z'),
                discount_end: null
            }, offer);

            const result = nextPaymentCalculator.calculate(subscription);

            assert.deepEqual(result, {
                original_amount: 500,
                amount: 500,
                interval: 'month',
                currency: 'USD',
                discount: null
            });
        });

        it('calculates percent discount correctly', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const offer = createOffer({type: 'percent', amount: 20, duration: 'forever'});
            const subscription = createSubscription({
                discount_start: new Date('2025-05-01T00:00:00.000Z'),
                discount_end: new Date('2025-11-01T00:00:00.000Z')
            }, offer);

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result.original_amount, 500);
            assert.equal(result.amount, 400); // 500 - 20% = 400
            assert.equal(result.discount.type, 'percent');
            assert.equal(result.discount.amount, 20);
        });

        it('calculates fixed discount correctly', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const offer = createOffer({type: 'fixed', amount: 100, duration: 'forever'});
            const subscription = createSubscription({
                discount_start: new Date('2025-05-01T00:00:00.000Z'),
                discount_end: new Date('2025-11-01T00:00:00.000Z')
            }, offer);

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result.original_amount, 500);
            assert.equal(result.amount, 400); // 500 - 100 = 400
            assert.equal(result.discount.type, 'fixed');
            assert.equal(result.discount.amount, 100);
        });

        it('handles forever duration', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const offer = createOffer({type: 'percent', amount: 50, duration: 'forever'});
            const subscription = createSubscription({
                discount_start: new Date('2025-01-01T00:00:00.000Z'),
                discount_end: null // Forever discounts don't have a discount_end (based on Stripe)
            }, offer);

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result.original_amount, 500);
            assert.equal(result.amount, 250); // 500 - 50% = 250
            assert.equal(result.discount.duration, 'forever');
            assert.equal(result.discount.offer_id, 'offer_123');
            assert.equal(result.discount.start, '2025-01-01T00:00:00.000Z');
            assert.equal(result.discount.end, null);
            assert.equal(result.discount.amount, 50);
            assert.equal(result.discount.type, 'percent');
        });

        it('handles once duration', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const offer = createOffer({type: 'percent', amount: 50, duration: 'once', redemption_type: 'retention'});
            const subscription = createSubscription({
                discount_start: new Date('2025-01-01T00:00:00.000Z'),
                discount_end: null // Once discounts don't have a discount_end (based on Stripe)
            }, offer);

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result.original_amount, 500);
            assert.equal(result.amount, 250); // 500 - 50% = 250
            assert.equal(result.discount.duration, 'once');
            assert.equal(result.discount.start, '2025-01-01T00:00:00.000Z');
            assert.equal(result.discount.end, null);
            assert.equal(result.discount.amount, 50);
            assert.equal(result.discount.type, 'percent');
            assert.equal(result.discount.offer_id, 'offer_123');
        });

        it('handles active repeating offers', function () {
            const nextPaymentCalculator = new NextPaymentCalculator();
            const offer = createOffer({type: 'percent', amount: 20, duration: 'repeating', duration_in_months: 888});
            const subscription = createSubscription({
                discount_start: new Date('2025-01-01T00:00:00.000Z'),
                discount_end: new Date('2099-01-01T00:00:00.000Z')
            }, offer);

            const result = nextPaymentCalculator.calculate(subscription);

            assert.equal(result.original_amount, 500);
            assert.equal(result.amount, 400);
            assert.equal(result.discount.duration, 'repeating');
            assert.equal(result.discount.offer_id, 'offer_123');
            assert.equal(result.discount.start, '2025-01-01T00:00:00.000Z');
            assert.equal(result.discount.end, '2099-01-01T00:00:00.000Z');
            assert.equal(result.discount.amount, 20);
            assert.equal(result.discount.type, 'percent');
            assert.equal(result.discount.offer_id, 'offer_123');
        });

        // Backportability tests - for signup offers without discount_start/discount_end
        describe('backportability for signup offers', function () {
            it('once signup offer does not apply to the next payment (already been applied to first payment)', function () {
                const nextPaymentCalculator = new NextPaymentCalculator();
                const offer = createOffer({type: 'percent', amount: 10, duration: 'once'});
                const subscription = createSubscription({
                    start_date: new Date('2025-05-20T00:00:00.000Z'),
                    discount_start: null,
                    discount_end: null
                }, offer);

                const result = nextPaymentCalculator.calculate(subscription);

                assert.equal(result.original_amount, 500);
                assert.equal(result.amount, 500); // No discount
                assert.equal(result.discount, null);
            });

            it('forever signup offer always applies to the next payment', function () {
                const nextPaymentCalculator = new NextPaymentCalculator();
                const offer = createOffer({type: 'percent', amount: 50, duration: 'forever'});
                const subscription = createSubscription({
                    start_date: new Date('2025-01-01T00:00:00.000Z'),
                    discount_start: null,
                    discount_end: null
                }, offer);

                const result = nextPaymentCalculator.calculate(subscription);

                assert.equal(result.original_amount, 500);
                assert.equal(result.amount, 250); // 500 - 50% = 250
                assert.notEqual(result.discount, null);
                assert.equal(result.discount.start, '2025-01-01T00:00:00.000Z'); // Uses subscription start_date
                assert.equal(result.discount.end, null);
            });

            it('repeating offer applies if current date is before subscription start_date + duration_in_months', function () {
                const nextPaymentCalculator = new NextPaymentCalculator();
                const offer = createOffer({type: 'percent', amount: 20, duration: 'repeating', duration_in_months: 888});
                const subscription = createSubscription({
                    start_date: new Date('2025-01-01T00:00:00.000Z'),
                    discount_start: null,
                    discount_end: null
                }, offer);

                const result = nextPaymentCalculator.calculate(subscription);

                assert.equal(result.amount, 400); // Discount still active
                assert.notEqual(result.discount, null);
                assert.equal(result.discount.start, '2025-01-01T00:00:00.000Z');
                assert.equal(result.discount.end, '2099-01-01T00:00:00.000Z'); // start_date + 888 months
            });

            it('repeating offer is inactive when start_date + duration_in_months is in the past', function () {
                const nextPaymentCalculator = new NextPaymentCalculator();
                const offer = createOffer({type: 'percent', amount: 20, duration: 'repeating', duration_in_months: 3});
                const subscription = createSubscription({
                    start_date: new Date('2025-01-01T00:00:00.000Z'),
                    discount_start: null,
                    discount_end: null
                }, offer);

                const result = nextPaymentCalculator.calculate(subscription);

                assert.equal(result.original_amount, 500);
                assert.equal(result.amount, 500);
                assert.equal(result.discount, null); // No discount as repeating offer has expired on 2025-04-01T00:00:00.000Z
            });

            it('retention offers are not backported', function () {
                const nextPaymentCalculator = new NextPaymentCalculator();
                const offer = createOffer({
                    type: 'percent',
                    amount: 50,
                    duration: 'forever',
                    redemption_type: 'retention'
                });
                const subscription = createSubscription({
                    start_date: new Date('2025-01-01T00:00:00.000Z'),
                    discount_start: null, // Missing discount_start
                    discount_end: null
                }, offer);

                const result = nextPaymentCalculator.calculate(subscription);

                assert.equal(result.original_amount, 500);
                assert.equal(result.amount, 500);
                assert.equal(result.discount, null); // No discount - retention offers need discount_start to be considered active
            });
        });
    });
});
