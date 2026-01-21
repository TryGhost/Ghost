const should = require('should');

const OfferRedemptionType = require('../../../../../../../core/server/services/offers/domain/models/offer-redemption-type');

describe('OfferRedemptionType', function () {
    describe('OfferRedemptionType.create factory', function () {
        it('Creates an Offer redemption type containing either "signup" or "retention"', function () {
            OfferRedemptionType.create('signup');
            OfferRedemptionType.create('retention');

            try {
                OfferRedemptionType.create('other');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferRedemptionType.InvalidOfferRedemptionType,
                    'expected an InvalidOfferRedemptionType error'
                );
            }

            try {
                OfferRedemptionType.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferRedemptionType.InvalidOfferRedemptionType,
                    'expected an InvalidOfferRedemptionType error'
                );
            }
        });
    });

    describe('OfferRedemptionType.Signup', function () {
        it('Is an OfferRedemptionType with a value of "signup"', function () {
            should.equal(OfferRedemptionType.Signup.value, 'signup');
            should.ok(OfferRedemptionType.Signup.equals(OfferRedemptionType.create('signup')));
        });
    });

    describe('OfferRedemptionType.Retention', function () {
        it('Is an OfferRedemptionType with a value of "retention"', function () {
            should.equal(OfferRedemptionType.Retention.value, 'retention');
            should.ok(OfferRedemptionType.Retention.equals(OfferRedemptionType.create('retention')));
        });
    });
});
