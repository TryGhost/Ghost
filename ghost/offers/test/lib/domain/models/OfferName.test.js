const OfferName = require('../../../../lib/domain/models/OfferName');

describe('OfferName', function () {
    describe('OfferName.create factory', function () {
        it('Creates an Offer description containing a string', function () {
            OfferName.create('My Offer');

            try {
                OfferName.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferName.InvalidOfferName,
                    'expected an InvalidOfferName error'
                );
            }

            try {
                OfferName.create(null);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferName.InvalidOfferName,
                    'expected an InvalidOfferName error'
                );
            }

            try {
                OfferName.create(12);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferName.InvalidOfferName,
                    'expected an InvalidOfferName error'
                );
            }

            try {
                OfferName.create({});
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferName.InvalidOfferName,
                    'expected an InvalidOfferName error'
                );
            }
        });

        it('Requires the string to be a maximum of 40 characters', function () {
            const maxLengthInput = Array.from({length: 40}).map(() => 'a').join('');

            should.equal(maxLengthInput.length, 40);

            OfferName.create(maxLengthInput);

            const tooLong = maxLengthInput + 'a';

            should.equal(tooLong.length, 41);

            try {
                OfferName.create(tooLong);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferName.InvalidOfferName,
                    'expected an InvalidOfferName error'
                );
            }
        });

        it('Trims the contents of the OfferName', function () {
            const description = OfferName.create('    Trim me!    ');

            should.equal(description.value, 'Trim me!');
        });
    });
});

