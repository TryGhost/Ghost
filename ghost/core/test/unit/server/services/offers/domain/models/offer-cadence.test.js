const assert = require('node:assert/strict');

const OfferCadence = require('../../../../../../../core/server/services/offers/domain/models/offer-cadence');

describe('OfferCadence', function () {
    describe('OfferCadence.create factory', function () {
        it('Will only create an OfferCadence containing a string of either "month" or "year"', function () {
            OfferCadence.create('month');
            OfferCadence.create('year');

            assert.throws(() => {
                OfferCadence.create();
            }, OfferCadence.InvalidOfferCadence);

            assert.throws(() => {
                OfferCadence.create(12);
            }, OfferCadence.InvalidOfferCadence);

            assert.throws(() => {
                OfferCadence.create('daily');
            }, OfferCadence.InvalidOfferCadence);
        });
    });

    it('Exposes a string on the value property', function () {
        const cadence = OfferCadence.create('month');

        assert.equal(typeof cadence.value, 'string');
    });
});
