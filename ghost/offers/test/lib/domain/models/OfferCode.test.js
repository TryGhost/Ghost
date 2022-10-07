const OfferCode = require('../../../../lib/domain/models/OfferCode');

describe('OfferCode', function () {
    describe('OfferCode.create factory', function () {
        it('Creates a sluggified code of a string', function () {
            OfferCode.create('code');

            try {
                OfferCode.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCode.InvalidOfferCode,
                    'expected an InvalidOfferCode error'
                );
            }

            try {
                OfferCode.create(1234);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCode.InvalidOfferCode,
                    'expected an InvalidOfferCode error'
                );
            }

            const code = OfferCode.create('Hello, world');

            should.equal(code.value, 'hello-world');
        });

        it('Requires the string to be a maximum of 191 characters', function () {
            const maxLengthInput = Array.from({length: 191}).map(() => 'a').join('');

            should.equal(maxLengthInput.length, 191);

            OfferCode.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            should.equal(tooLong.length, 192);

            try {
                OfferCode.create(tooLong);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCode.InvalidOfferCode,
                    'expected an InvalidOfferCode error'
                );
            }
        });
    });
});
