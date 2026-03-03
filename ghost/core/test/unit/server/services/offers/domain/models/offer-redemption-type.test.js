const assert = require('node:assert/strict');

const OfferRedemptionType = require('../../../../../../../core/server/services/offers/domain/models/offer-redemption-type');

describe('OfferRedemptionType', function () {
    describe('OfferRedemptionType.create factory', function () {
        it('Creates an Offer redemption type containing either "signup" or "retention"', function () {
            OfferRedemptionType.create('signup');
            OfferRedemptionType.create('retention');

            try {
                OfferRedemptionType.create('other');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferRedemptionType.InvalidOfferRedemptionType, 'expected an InvalidOfferRedemptionType error');
            }

            try {
                OfferRedemptionType.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferRedemptionType.InvalidOfferRedemptionType, 'expected an InvalidOfferRedemptionType error');
            }
        });
    });

    describe('OfferRedemptionType.Signup', function () {
        it('Is an OfferRedemptionType with a value of "signup"', function () {
            assert.equal(OfferRedemptionType.Signup.value, 'signup');
            assert(OfferRedemptionType.Signup.equals(OfferRedemptionType.create('signup')));
        });
    });

    describe('OfferRedemptionType.Retention', function () {
        it('Is an OfferRedemptionType with a value of "retention"', function () {
            assert.equal(OfferRedemptionType.Retention.value, 'retention');
            assert(OfferRedemptionType.Retention.equals(OfferRedemptionType.create('retention')));
        });
    });
});
