const assert = require('node:assert/strict');

const OfferTitle = require('../../../../../../../core/server/services/offers/domain/models/offer-title');

describe('OfferTitle', function () {
    describe('OfferTitle.create factory', function () {
        it('Creates an Offer description containing a string', function () {
            OfferTitle.create('Hello, world');

            assert.equal(OfferTitle.create().value, '');
            assert.equal(OfferTitle.create(undefined).value, '');
            assert.equal(OfferTitle.create(null).value, '');

            assert.throws(() => {
                OfferTitle.create(12);
            }, OfferTitle.InvalidOfferTitle);

            assert.throws(() => {
                OfferTitle.create({});
            }, OfferTitle.InvalidOfferTitle);
        });

        it('Requires the string to be a maximum of 191 characters', function () {
            const maxLengthInput = Array.from({length: 191}).map(() => 'a').join('');

            assert.equal(maxLengthInput.length, 191);

            OfferTitle.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            assert.equal(tooLong.length, 192);

            assert.throws(() => {
                OfferTitle.create(tooLong);
            }, OfferTitle.InvalidOfferTitle);
        });

        it('Trims the contents of the OfferTitle', function () {
            const description = OfferTitle.create('    Trim me!    ');

            assert.equal(description.value, 'Trim me!');
        });
    });
});
