const should = require('should');
const StripeCoupon = require('../../../../../../../core/server/services/offers/domain/models/StripeCoupon');

describe('StripeCoupon', function () {
    describe('StripeCoupon.create factory', function () {
        it('Creates a valid StripeCoupon with percent_off', function () {
            const coupon = StripeCoupon.create({
                id: 'coupon_123',
                percent_off: 20,
                duration: 'forever'
            });

            should.ok(coupon instanceof StripeCoupon);
            should.equal(coupon.id, 'coupon_123');
            should.equal(coupon.percent_off, 20);
            should.equal(coupon.duration, 'forever');
            should.equal(coupon.amount_off, undefined);
        });

        it('Creates a valid StripeCoupon with amount_off', function () {
            const coupon = StripeCoupon.create({
                id: 'coupon_456',
                amount_off: 500,
                currency: 'usd',
                duration: 'once'
            });

            should.ok(coupon instanceof StripeCoupon);
            should.equal(coupon.id, 'coupon_456');
            should.equal(coupon.amount_off, 500);
            should.equal(coupon.currency, 'usd');
            should.equal(coupon.duration, 'once');
            should.equal(coupon.percent_off, undefined);
        });

        it('Creates a valid StripeCoupon with repeating duration', function () {
            const coupon = StripeCoupon.create({
                id: 'coupon_789',
                percent_off: 10,
                duration: 'repeating',
                duration_in_months: 3
            });

            should.ok(coupon instanceof StripeCoupon);
            should.equal(coupon.duration, 'repeating');
            should.equal(coupon.duration_in_months, 3);
        });

        it('Throws if coupon is null or undefined', function () {
            should.throws(() => {
                StripeCoupon.create(null);
            }, /Stripe coupon is required/);

            should.throws(() => {
                StripeCoupon.create(undefined);
            }, /Stripe coupon is required/);
        });

        it('Throws if coupon is not an object', function () {
            should.throws(() => {
                StripeCoupon.create('not-an-object');
            }, /Stripe coupon is required/);

            should.throws(() => {
                StripeCoupon.create(123);
            }, /Stripe coupon is required/);
        });

        it('Throws if id is missing', function () {
            should.throws(() => {
                StripeCoupon.create({
                    percent_off: 20,
                    duration: 'forever'
                });
            }, /Stripe coupon `id` is required and must be a string/);
        });

        it('Throws if id is not a string', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 123,
                    percent_off: 20,
                    duration: 'forever'
                });
            }, /Stripe coupon `id` is required and must be a string/);
        });

        it('Throws if both percent_off and amount_off are set', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    percent_off: 20,
                    amount_off: 500,
                    duration: 'forever'
                });
            }, /Stripe coupon must have either `percent_off` or `amount_off` but not both/);
        });

        it('Throws if neither percent_off nor amount_off is set', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    duration: 'forever'
                });
            }, /Stripe coupon must have either `percent_off` or `amount_off` set/);
        });

        it('Throws if percent_off is not a number', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    percent_off: '20',
                    duration: 'forever'
                });
            }, /Stripe coupon `percent_off` must be a number/);
        });

        it('Throws if amount_off is not a number', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    amount_off: '500',
                    currency: 'usd',
                    duration: 'forever'
                });
            }, /Stripe coupon `amount_off` must be a number/);
        });

        it('Throws if amount_off is set without currency', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    amount_off: 500,
                    duration: 'forever'
                });
            }, /Stripe coupon `amount_off` must have a `currency` set/);
        });

        it('Throws if amount_off is set with non-string currency', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    amount_off: 500,
                    currency: 123,
                    duration: 'forever'
                });
            }, /Stripe coupon `amount_off` must have a `currency` set/);
        });

        it('Throws if duration is missing', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    percent_off: 20
                });
            }, /Stripe coupon `duration` is required and must be a string/);
        });

        it('Throws if duration is not a string', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    percent_off: 20,
                    duration: 123
                });
            }, /Stripe coupon `duration` is required and must be a string/);
        });

        it('Throws if duration_in_months is not a number', function () {
            should.throws(() => {
                StripeCoupon.create({
                    id: 'coupon_123',
                    percent_off: 20,
                    duration: 'repeating',
                    duration_in_months: '3'
                });
            }, /Stripe coupon `duration_in_months` must be a number/);
        });
    });
});

