const OfferType = require('../../../../lib/domain/models/OfferType');

describe('OfferType', function () {
    describe('OfferType.create factory', function () {
        it('Creates an Offer type containing either "fixed" or "percent"', function () {
            OfferType.create('fixed');
            OfferType.create('percent');

            try {
                OfferType.create('other');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferType.InvalidOfferType,
                    'expected an InvalidOfferType error'
                );
            }

            try {
                OfferType.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferType.InvalidOfferType,
                    'expected an InvalidOfferType error'
                );
            }
        });
    });

    describe('OfferType.Percentage', function () {
        it('Is an OfferType with a value of "percent"', function () {
            should.equal(OfferType.Percentage.value, 'percent');
            should.ok(OfferType.Percentage.equals(OfferType.create('percent')));
        });
    });

    describe('OfferType.Fixed', function () {
        it('Is an OfferType with a value of "fixed"', function () {
            should.equal(OfferType.Fixed.value, 'fixed');
            should.ok(OfferType.Fixed.equals(OfferType.create('fixed')));
        });
    });
});
