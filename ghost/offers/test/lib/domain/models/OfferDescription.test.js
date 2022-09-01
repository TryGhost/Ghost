const OfferDescription = require('../../../../lib/domain/models/OfferDescription');

describe('OfferDescription', function () {
    describe('OfferDescription.create factory', function () {
        it('Creates an Offer description containing a string', function () {
            OfferDescription.create('Hello, world');

            should.equal(OfferDescription.create().value, '');
            should.equal(OfferDescription.create(undefined).value, '');
            should.equal(OfferDescription.create(null).value, '');

            try {
                OfferDescription.create(12);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDescription.InvalidOfferDescription,
                    'expected an InvalidOfferDescription error'
                );
            }

            try {
                OfferDescription.create({});
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDescription.InvalidOfferDescription,
                    'expected an InvalidOfferDescription error'
                );
            }
        });

        it('Requires the string to be a maximum of 191 characters', function () {
            const maxLengthInput = Array.from({length: 191}).map(() => 'a').join('');

            should.equal(maxLengthInput.length, 191);

            OfferDescription.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            should.equal(tooLong.length, 192);

            try {
                OfferDescription.create(tooLong);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDescription.InvalidOfferDescription,
                    'expected an InvalidOfferDescription error'
                );
            }
        });

        it('Trims the contents of the OfferDescription', function () {
            const description = OfferDescription.create('    Trim me!    ');

            should.equal(description.value, 'Trim me!');
        });
    });
});

