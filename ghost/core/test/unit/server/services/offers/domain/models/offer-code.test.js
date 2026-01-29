const assert = require('node:assert/strict');

const OfferCode = require('../../../../../../../core/server/services/offers/domain/models/offer-code');

describe('OfferCode', function () {
    describe('OfferCode.create factory', function () {
        it('Creates a sluggified code of a string', function () {
            OfferCode.create('code');

            assert.throws(() => {
                OfferCode.create();
            }, OfferCode.InvalidOfferCode);

            assert.throws(() => {
                OfferCode.create(1234);
            }, OfferCode.InvalidOfferCode);

            const code = OfferCode.create('Hello, world');

            assert.equal(code.value, 'hello-world');
        });

        it('Requires the string to be a maximum of 191 characters', function () {
            const maxLengthInput = Array.from({length: 191}).map(() => 'a').join('');

            assert.equal(maxLengthInput.length, 191);

            OfferCode.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            assert.equal(tooLong.length, 192);

            assert.throws(() => {
                OfferCode.create(tooLong);
            }, OfferCode.InvalidOfferCode);
        });
    });
});