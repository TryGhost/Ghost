const assert = require('node:assert/strict');

const OfferType = require('../../../../../../../core/server/services/offers/domain/models/offer-type');

describe('OfferType', function () {
    describe('OfferType.create factory', function () {
        it('Creates an Offer type containing either "fixed" or "percent"', function () {
            OfferType.create('fixed');
            OfferType.create('percent');
            OfferType.create('trial');

            assert.throws(() => {
                OfferType.create('other');
            }, OfferType.InvalidOfferType);

            assert.throws(() => {
                OfferType.create();
            }, OfferType.InvalidOfferType);
        });
    });

    describe('OfferType.Percentage', function () {
        it('Is an OfferType with a value of "percent"', function () {
            assert.equal(OfferType.Percentage.value, 'percent');
            assert.ok(OfferType.Percentage.equals(OfferType.create('percent')));
        });
    });

    describe('OfferType.Fixed', function () {
        it('Is an OfferType with a value of "fixed"', function () {
            assert.equal(OfferType.Fixed.value, 'fixed');
            assert.ok(OfferType.Fixed.equals(OfferType.create('fixed')));
        });
    });

    describe('OfferType.Trial', function () {
        it('Is an OfferType with a value of "trial"', function () {
            assert.equal(OfferType.Trial.value, 'trial');
            assert.ok(OfferType.Trial.equals(OfferType.create('trial')));
        });
    });
});
