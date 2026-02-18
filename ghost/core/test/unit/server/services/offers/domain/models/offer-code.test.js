const assert = require('node:assert/strict');

const OfferCode = require('../../../../../../../core/server/services/offers/domain/models/offer-code');

describe('OfferCode', function () {
    describe('OfferCode.create factory', function () {
        it('Creates a sluggified code of a string', function () {
            OfferCode.create('code');

            try {
                OfferCode.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCode.InvalidOfferCode, 'expected an InvalidOfferCode error');
            }

            try {
                OfferCode.create(1234);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCode.InvalidOfferCode, 'expected an InvalidOfferCode error');
            }

            const code = OfferCode.create('Hello, world');

            assert.equal(code.value, 'hello-world');
        });

        it('Requires the string to be a maximum of 191 characters', function () {
            const maxLengthInput = Array.from({length: 191}).map(() => 'a').join('');

            assert.equal(maxLengthInput.length, 191);

            OfferCode.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            assert.equal(tooLong.length, 192);

            try {
                OfferCode.create(tooLong);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCode.InvalidOfferCode, 'expected an InvalidOfferCode error');
            }
        });
    });
});
