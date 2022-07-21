const OfferTitle = require('../../../../lib/domain/models/OfferTitle');

describe('OfferTitle', function () {
    describe('OfferTitle.create factory', function () {
        it('Creates an Offer description containing a string', function () {
            OfferTitle.create('Hello, world');

            should.equal(OfferTitle.create().value, '');
            should.equal(OfferTitle.create(undefined).value, '');
            should.equal(OfferTitle.create(null).value, '');

            try {
                OfferTitle.create(12);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferTitle.InvalidOfferTitle,
                    'expected an InvalidOfferTitle error'
                );
            }

            try {
                OfferTitle.create({});
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferTitle.InvalidOfferTitle,
                    'expected an InvalidOfferTitle error'
                );
            }
        });

        it('Requires the string to be a maximum of 191 characters', function () {
            const maxLengthInput = Array.from({length: 191}).map(() => 'a').join('');

            should.equal(maxLengthInput.length, 191);

            OfferTitle.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            should.equal(tooLong.length, 192);

            try {
                OfferTitle.create(tooLong);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferTitle.InvalidOfferTitle,
                    'expected an InvalidOfferTitle error'
                );
            }
        });

        it('Trims the contents of the OfferTitle', function () {
            const description = OfferTitle.create('    Trim me!    ');

            should.equal(description.value, 'Trim me!');
        });
    });
});

