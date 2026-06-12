const assert = require('node:assert/strict');

const OfferDescription = require('../../../../../../../core/server/services/offers/domain/models/offer-description');

describe('OfferDescription', function () {
    describe('OfferDescription.create factory', function () {
        it('Creates an Offer description containing a string', function () {
            OfferDescription.create('Hello, world');

            assert.equal(OfferDescription.create().value, '');
            assert.equal(OfferDescription.create(undefined).value, '');
            assert.equal(OfferDescription.create(null).value, '');

            try {
                OfferDescription.create(12);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDescription.InvalidOfferDescription, 'expected an InvalidOfferDescription error');
            }

            try {
                OfferDescription.create({});
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDescription.InvalidOfferDescription, 'expected an InvalidOfferDescription error');
            }
        });

        it('Requires the string to be a maximum of 191 characters', function () {
            const maxLengthInput = Array.from({length: 191}).map(() => 'a').join('');

            assert.equal(maxLengthInput.length, 191);

            OfferDescription.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            assert.equal(tooLong.length, 192);

            try {
                OfferDescription.create(tooLong);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDescription.InvalidOfferDescription, 'expected an InvalidOfferDescription error');
            }
        });

        it('Trims the contents of the OfferDescription', function () {
            const description = OfferDescription.create('    Trim me!    ');

            assert.equal(description.value, 'Trim me!');
        });
    });
});

