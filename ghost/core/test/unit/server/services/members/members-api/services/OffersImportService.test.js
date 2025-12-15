const assert = require('assert/strict');
const sinon = require('sinon');
const OffersImportService = require('../../../../../../../core/server/services/offers/OffersImportService');

describe('OffersImportService', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('ensureOfferForCoupon', function () {
        it('reuses existing offer if it exists', async function () {
            const offerRepository = {
                getByStripeCouponId: sinon.stub().resolves({id: 'offer_existing'})
            };
            const offersAPI = {
                createOffer: sinon.stub().resolves()
            };

            const service = new OffersImportService({offersAPI, offerRepository});
            const id = await service.ensureOfferForCoupon({
                coupon: {id: 'EXISTING2024'},
                cadence: 'month',
                tier: {id: 'tier_1'}
            });

            assert.equal(id, 'offer_existing');
            assert.equal(offersAPI.createOffer.called, false);
        });

        it('creates offer when missing', async function () {
            const offerRepository = {
                getByStripeCouponId: sinon.stub().resolves(null)
            };
            const offersAPI = {
                createOffer: sinon.stub().resolves({id: 'offer_new'})
            };

            const service = new OffersImportService({offersAPI, offerRepository});
            const transacting = {executionPromise: Promise.resolve()};

            const id = await service.ensureOfferForCoupon({
                coupon: {id: 'NEWYEAR10', percent_off: 10, duration: 'forever'},
                cadence: 'month',
                tier: {id: 'tier_1'},
                transacting
            });

            assert.equal(id, 'offer_new');
            assert.equal(offersAPI.createOffer.calledOnce, true);
            assert.equal(offersAPI.createOffer.firstCall.args[1].transacting, transacting);
        });

        it('returns null for invalid coupons', async function () {
            const offerRepository = {
                getByStripeCouponId: sinon.stub().resolves(null)
            };
            const offersAPI = {
                createOffer: sinon.stub()
            };

            const service = new OffersImportService({offersAPI, offerRepository});

            // Coupon with no percent_off or amount_off
            const id1 = await service.ensureOfferForCoupon({
                coupon: {id: 'INVALID'},
                cadence: 'month',
                tier: {id: 'tier_1'}
            });
            assert.equal(id1, null);

            // Null coupon
            const id2 = await service.ensureOfferForCoupon({
                coupon: null,
                cadence: 'month',
                tier: {id: 'tier_1'}
            });
            assert.equal(id2, null);

            // Coupon without id
            const id3 = await service.ensureOfferForCoupon({
                coupon: {percent_off: 10},
                cadence: 'month',
                tier: {id: 'tier_1'}
            });
            assert.equal(id3, null);

            // amount_off without currency
            const id4 = await service.ensureOfferForCoupon({
                coupon: {id: 'NOCURRENCY', amount_off: 500, duration: 'once'},
                cadence: 'month',
                tier: {id: 'tier_1'}
            });
            assert.equal(id4, null);

            assert.equal(offersAPI.createOffer.called, false);
        });

        it('returns null when createOffer throws', async function () {
            const offerRepository = {
                getByStripeCouponId: sinon.stub().resolves(null)
            };
            const offersAPI = {
                createOffer: sinon.stub().rejects(new Error('Database error'))
            };

            const service = new OffersImportService({offersAPI, offerRepository});

            const id = await service.ensureOfferForCoupon({
                coupon: {id: 'DBERROR', percent_off: 10, duration: 'forever'},
                cadence: 'month',
                tier: {id: 'tier_1'}
            });

            assert.equal(id, null);
        });
    });

    describe('coupon mapping', function () {
        let service;
        let offersAPI;

        beforeEach(function () {
            const offerRepository = {
                getByStripeCouponId: sinon.stub().resolves(null)
            };
            offersAPI = {
                createOffer: sinon.stub().resolves({id: 'offer_new'})
            };
            service = new OffersImportService({offersAPI, offerRepository});
        });

        it('maps percent_off coupon correctly', async function () {
            await service.ensureOfferForCoupon({
                coupon: {id: 'SUMMER2024', percent_off: 25, duration: 'forever'},
                cadence: 'month',
                tier: {id: 'tier_1', name: 'Premium'}
            });

            const data = offersAPI.createOffer.firstCall.args[0];
            assert.equal(data.type, 'percent');
            assert.equal(data.amount, 25);
            assert.equal(data.duration, 'forever');
            assert.equal(data.cadence, 'month');
            assert.equal(data.currency, null);
            assert.equal(data.name, '25% off forever (SUMMER2024)');
            assert.equal(data.display_title, '25% off forever (SUMMER2024)');
            assert.equal(data.code, 'SUMMER2024');
            assert.equal(data.stripe_coupon_id, 'SUMMER2024');
            assert.equal(data.status, 'archived');
            assert.equal(data.tier.id, 'tier_1');
            assert.equal(data.tier.name, 'Premium');
        });

        it('maps amount_off coupon correctly', async function () {
            await service.ensureOfferForCoupon({
                coupon: {id: 'SAVE5', amount_off: 500, currency: 'usd', duration: 'once'},
                cadence: 'year',
                tier: {id: 'tier_1'}
            });

            const data = offersAPI.createOffer.firstCall.args[0];
            assert.equal(data.type, 'fixed');
            assert.equal(data.amount, 500);
            assert.equal(data.duration, 'once');
            assert.equal(data.cadence, 'year');
            assert.equal(data.currency, 'usd');
            assert.equal(data.name, 'USD 5 off once (SAVE5)');
        });

        it('maps repeating duration correctly', async function () {
            await service.ensureOfferForCoupon({
                coupon: {id: 'MONTHLY6', percent_off: 30, duration: 'repeating', duration_in_months: 6},
                cadence: 'month',
                tier: {id: 'tier_1'}
            });

            const data = offersAPI.createOffer.firstCall.args[0];
            assert.equal(data.duration, 'repeating');
            assert.equal(data.duration_in_months, 6);
            assert.equal(data.name, '30% off for 6 months (MONTHLY6)');
        });

        it('sets duration_in_months to null for non-repeating', async function () {
            await service.ensureOfferForCoupon({
                coupon: {id: 'FOREVER10', percent_off: 10, duration: 'forever'},
                cadence: 'month',
                tier: {id: 'tier_1'}
            });

            const data = offersAPI.createOffer.firstCall.args[0];
            assert.equal(data.duration_in_months, null);
        });
    });

    describe('name generation', function () {
        let service;
        let offersAPI;

        beforeEach(function () {
            const offerRepository = {
                getByStripeCouponId: sinon.stub().resolves(null)
            };
            offersAPI = {
                createOffer: sinon.stub().resolves({id: 'offer_new'})
            };
            service = new OffersImportService({offersAPI, offerRepository});
        });

        const testCases = [
            {coupon: {id: 'SUMMER2024', percent_off: 20, duration: 'forever'}, expected: '20% off forever (SUMMER2024)'},
            {coupon: {id: 'WELCOME15', percent_off: 15, duration: 'once'}, expected: '15% off once (WELCOME15)'},
            {coupon: {id: 'SPRING30', percent_off: 30, duration: 'repeating', duration_in_months: 6}, expected: '30% off for 6 months (SPRING30)'},
            {coupon: {id: 'SAVE5', amount_off: 500, currency: 'usd', duration: 'forever'}, expected: 'USD 5 off forever (SAVE5)'},
            {coupon: {id: 'EURO10OFF', amount_off: 1000, currency: 'eur', duration: 'once'}, expected: 'EUR 10 off once (EURO10OFF)'},
            {coupon: {id: 'BLACKFRIDAY', amount_off: 200, currency: 'gbp', duration: 'repeating', duration_in_months: 3}, expected: 'GBP 2 off for 3 months (BLACKFRIDAY)'},
            {coupon: {id: 'FIRSTTIME', amount_off: 199, currency: 'usd', duration: 'once'}, expected: 'USD 1.99 off once (FIRSTTIME)'}
        ];

        testCases.forEach(({coupon, expected}) => {
            it(`generates "${expected}"`, async function () {
                await service.ensureOfferForCoupon({
                    coupon,
                    cadence: 'month',
                    tier: {id: 'tier_1'}
                });

                const data = offersAPI.createOffer.firstCall.args[0];
                assert.equal(data.name, expected);
            });
        });
    });
});
