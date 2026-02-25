const assert = require('node:assert/strict');

const OfferType = require('../../../../../../../core/server/services/offers/domain/models/offer-type');

describe('OfferType', function () {
    describe('OfferType.create factory', function () {
        it('Creates an Offer type containing either "fixed", "percent" or "trial"', function () {
            OfferType.create('fixed');
            OfferType.create('percent');
            OfferType.create('trial');

            try {
                OfferType.create('other');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferType.InvalidOfferType, 'expected an InvalidOfferType error');
            }

            try {
                OfferType.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferType.InvalidOfferType, 'expected an InvalidOfferType error');
            }
        });
    });

    describe('OfferType.Percentage', function () {
        it('Is an OfferType with a value of "percent"', function () {
            assert.equal(OfferType.Percentage.value, 'percent');
            assert(OfferType.Percentage.equals(OfferType.create('percent')));
        });
    });

    describe('OfferType.Fixed', function () {
        it('Is an OfferType with a value of "fixed"', function () {
            assert.equal(OfferType.Fixed.value, 'fixed');
            assert(OfferType.Fixed.equals(OfferType.create('fixed')));
        });
    });

    describe('OfferType.Trial', function () {
        it('Is an OfferType with a value of "trial"', function () {
            assert.equal(OfferType.Trial.value, 'trial');
            assert(OfferType.Trial.equals(OfferType.create('trial')));
        });
    });
});
