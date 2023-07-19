const sinon = require('sinon');
const OfferRepository = require('../../../lib/application/OfferRepository');

const Offer = {
    add: sinon.stub()
};

describe('OfferRepository', function () {
    describe('#createFromCoupon', function () {
        it('creates a 50% off for 3 months offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                percent_off: 50,
                duration: 'repeating',
                duration_in_months: 3
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'month',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'month',
                currency: 'usd',
                duration: 'repeating',
                duration_in_months: 3,
                portal_title: 'Coupon Name',
                discount_type: 'percent',
                discount_amount: 50
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });

        it('creates a 1 USD off for 3 months offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                amount_off: 1,
                duration: 'repeating',
                duration_in_months: 3
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'month',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'month',
                currency: 'usd',
                duration: 'repeating',
                duration_in_months: 3,
                portal_title: 'Coupon Name',
                discount_type: 'amount',
                discount_amount: 1
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });

        it('creates a 50% off forever offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                percent_off: 50,
                duration: 'forever',
                duration_in_months: null
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'month',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'month',
                currency: 'usd',
                duration: 'forever',
                duration_in_months: null,
                portal_title: 'Coupon Name',
                discount_type: 'percent',
                discount_amount: 50
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });

        it('creates a 1 USD off forever offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                amount_off: 1,
                duration: 'forever',
                duration_in_months: null
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'month',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'month',
                currency: 'usd',
                duration: 'forever',
                duration_in_months: null,
                portal_title: 'Coupon Name',
                discount_type: 'amount',
                discount_amount: 1
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });

        it('creates a 50% USD off once yearly offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                percent_off: 50,
                duration: 'once',
                duration_in_months: null
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'yearly',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'yearly',
                currency: 'usd',
                duration: 'once',
                duration_in_months: null,
                portal_title: 'Coupon Name',
                discount_type: 'percent',
                discount_amount: 50
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });

        it('creates a 1 USD off once yearly offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                amount_off: 1,
                duration: 'once',
                duration_in_months: null
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'yearly',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'yearly',
                currency: 'usd',
                duration: 'once',
                duration_in_months: null,
                portal_title: 'Coupon Name',
                discount_type: 'amount',
                discount_amount: 1
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });

        it('creates a 50% off during one month offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                percent_off: 50,
                duration: 'repeating',
                duration_in_months: 1
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'month',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'month',
                currency: 'usd',
                duration: 'repeating',
                duration_in_months: 1,
                portal_title: 'Coupon Name',
                discount_type: 'percent',
                discount_amount: 50
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });

        it('creates a 1 USD off during one month offer', async function () {
            const coupon = {
                id: 'coupon-id',
                name: 'Coupon Name',
                amount_off: 1,
                duration: 'repeating',
                duration_in_months: 1
            };

            const params = {
                productId: 'product-id',
                currency: 'usd',
                interval: 'month',
                active: true
            };

            const options = {
                transacting: true
            };

            const expectedData = {
                active: true,
                name: 'Coupon Name',
                code: 'coupon-name',
                product_id: 'product-id',
                stripe_coupon_id: 'coupon-id',
                interval: 'month',
                currency: 'usd',
                duration: 'repeating',
                duration_in_months: 1,
                portal_title: 'Coupon Name',
                discount_type: 'amount',
                discount_amount: 1
            };

            const offerRepository = new OfferRepository(Offer);
            await offerRepository.createFromCoupon(coupon, params, options);

            Offer.add.calledWith(expectedData, options).should.be.true();
        });
    });
});
