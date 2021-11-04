const OfferCadence = require('../../../../lib/domain/models/OfferCadence');

describe('OfferCadence', function () {
    describe('OfferCadence.create factory', function () {
        it('Will only create an OfferCadence containing a string of either "month" or "year"', function () {
            OfferCadence.create('month');
            OfferCadence.create('year');

            try {
                OfferCadence.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCadence.InvalidOfferCadence,
                    'expected an InvalidOfferCadence error'
                );
            }

            try {
                OfferCadence.create(12);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCadence.InvalidOfferCadence,
                    'expected an InvalidOfferCadence error'
                );
            }

            try {
                OfferCadence.create('daily');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCadence.InvalidOfferCadence,
                    'expected an InvalidOfferCadence error'
                );
            }
        });
    });

    it('Exposes a string on the value property', function () {
        const cadence = OfferCadence.create('month');

        should.ok(typeof cadence.value === 'string');
    });
});
