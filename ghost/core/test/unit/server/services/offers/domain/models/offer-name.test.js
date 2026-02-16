const assert = require('node:assert/strict');
const should = require('should');

const OfferName = require('../../../../../../../core/server/services/offers/domain/models/offer-name');

describe('OfferName', function () {
    describe('OfferName.create factory', function () {
        it('Creates an Offer description containing a string', function () {
            OfferName.create('My Offer');

            try {
                OfferName.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferName.InvalidOfferName, 'expected an InvalidOfferName error');
            }

            try {
                OfferName.create(null);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferName.InvalidOfferName, 'expected an InvalidOfferName error');
            }

            try {
                OfferName.create(12);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferName.InvalidOfferName, 'expected an InvalidOfferName error');
            }

            try {
                OfferName.create({});
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferName.InvalidOfferName, 'expected an InvalidOfferName error');
            }
        });

        it('Requires the string to be a maximum of 40 characters', function () {
            const maxLengthInput = Array.from({length: 40}).map(() => 'a').join('');

            assert.equal(maxLengthInput.length, 40);

            OfferName.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            assert.equal(tooLong.length, 41);

            try {
                OfferName.create(tooLong);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferName.InvalidOfferName, 'expected an InvalidOfferName error');
            }
        });

        it('Trims the contents of the OfferName', function () {
            const description = OfferName.create('    Trim me!    ');

            assert.equal(description.value, 'Trim me!');
        });
    });
});

