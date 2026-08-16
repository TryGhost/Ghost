const assert = require('node:assert/strict');
const {BadRequestError} = require('@tryghost/errors');
const {
    resolveGiftDuration,
    validateGiftCheckoutOffer
} = require('../../../../../core/server/services/gifts/gift-checkout-offer');

describe('gift checkout offer', function () {
    const tier = {
        status: 'active',
        visibility: 'public',
        type: 'paid',
        currency: 'USD',
        monthlyPrice: 500,
        yearlyPrice: 5000
    };

    describe('resolveGiftDuration', function () {
        it('maps total months to the stored cadence and billing duration', function () {
            assert.deepEqual(resolveGiftDuration({duration: 1}), {
                cadence: 'month',
                billingDuration: 1,
                portalPlan: 'monthly',
                priceProperty: 'monthlyPrice',
                multiplier: 1,
                totalMonths: 1,
                isCadenceOnly: false
            });
            assert.deepEqual(resolveGiftDuration({duration: 3}), {
                cadence: 'month',
                billingDuration: 3,
                portalPlan: 'monthly',
                priceProperty: 'monthlyPrice',
                multiplier: 3,
                totalMonths: 3,
                isCadenceOnly: false
            });
            assert.deepEqual(resolveGiftDuration({duration: 6}), {
                cadence: 'month',
                billingDuration: 6,
                portalPlan: 'monthly',
                priceProperty: 'monthlyPrice',
                multiplier: 6,
                totalMonths: 6,
                isCadenceOnly: false
            });
            assert.deepEqual(resolveGiftDuration({duration: 12}), {
                cadence: 'year',
                billingDuration: 1,
                portalPlan: 'yearly',
                priceProperty: 'yearlyPrice',
                multiplier: 1,
                totalMonths: 12,
                isCadenceOnly: false
            });
        });

        it('maps legacy cadence-only requests', function () {
            assert.equal(resolveGiftDuration({cadence: 'month'}).totalMonths, 1);
            assert.equal(resolveGiftDuration({cadence: 'year'}).totalMonths, 12);
            assert.equal(resolveGiftDuration({cadence: 'year'}).isCadenceOnly, true);
        });

        it('accepts matching cadence and duration', function () {
            assert.equal(resolveGiftDuration({cadence: 'month', duration: 3}).cadence, 'month');
            assert.equal(resolveGiftDuration({cadence: 'year', duration: 12}).cadence, 'year');
        });

        it('rejects malformed, unsupported and conflicting requests', function () {
            for (const request of [
                {},
                {duration: '3'},
                {duration: 2},
                {duration: 3.5},
                {duration: 3, cadence: 'year'},
                {duration: 12, cadence: 'month'},
                {cadence: 'week'}
            ]) {
                assert.throws(() => resolveGiftDuration(request), BadRequestError);
            }
        });
    });

    describe('validateGiftCheckoutOffer', function () {
        it('derives authoritative amounts from the tier price', function () {
            assert.deepEqual(validateGiftCheckoutOffer({
                tier,
                portalPlans: ['monthly', 'yearly'],
                offer: resolveGiftDuration({duration: 3})
            }), {
                cadence: 'month',
                duration: 3,
                totalMonths: 3,
                amount: 1500
            });

            assert.deepEqual(validateGiftCheckoutOffer({
                tier,
                portalPlans: ['monthly', 'yearly'],
                offer: resolveGiftDuration({duration: 12})
            }), {
                cadence: 'year',
                duration: 1,
                totalMonths: 12,
                amount: 5000
            });
        });

        it('rejects unavailable tiers', function () {
            for (const unavailableTier of [
                {...tier, status: 'archived'},
                {...tier, visibility: 'none'},
                {...tier, type: 'free'}
            ]) {
                assert.throws(() => validateGiftCheckoutOffer({
                    tier: unavailableTier,
                    portalPlans: ['monthly', 'yearly'],
                    offer: resolveGiftDuration({duration: 3})
                }), BadRequestError);
            }
        });

        it('rejects durations disabled in Portal', function () {
            assert.throws(() => validateGiftCheckoutOffer({
                tier,
                portalPlans: ['yearly'],
                offer: resolveGiftDuration({duration: 3})
            }), BadRequestError);
            assert.throws(() => validateGiftCheckoutOffer({
                tier,
                portalPlans: ['monthly'],
                offer: resolveGiftDuration({duration: 12})
            }), BadRequestError);
        });

        it('exempts legacy cadence-only requests from the Portal plan gate', function () {
            assert.deepEqual(validateGiftCheckoutOffer({
                tier,
                portalPlans: ['monthly'],
                offer: resolveGiftDuration({cadence: 'year'})
            }), {
                cadence: 'year',
                duration: 1,
                totalMonths: 12,
                amount: 5000
            });
        });

        it('rejects missing or invalid prices and currency', function () {
            for (const invalidTier of [
                {...tier, monthlyPrice: null},
                {...tier, monthlyPrice: 0},
                {...tier, monthlyPrice: 1.5},
                {...tier, currency: null}
            ]) {
                assert.throws(() => validateGiftCheckoutOffer({
                    tier: invalidTier,
                    portalPlans: ['monthly'],
                    offer: resolveGiftDuration({duration: 3})
                }), BadRequestError);
            }
        });
    });
});
