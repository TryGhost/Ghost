const assert = require('node:assert/strict');
const should = require('should');

const OfferCadence = require('../../../../../../../core/server/services/offers/domain/models/offer-cadence');

describe('OfferCadence', function () {
    describe('OfferCadence.create factory', function () {
        it('Will only create an OfferCadence containing a string of either "month" or "year"', function () {
            OfferCadence.create('month');
            OfferCadence.create('year');

            try {
                OfferCadence.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCadence.InvalidOfferCadence, 'expected an InvalidOfferCadence error');
            }

            try {
                OfferCadence.create(12);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCadence.InvalidOfferCadence, 'expected an InvalidOfferCadence error');
            }

            try {
                OfferCadence.create('daily');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCadence.InvalidOfferCadence, 'expected an InvalidOfferCadence error');
            }
        });
    });

    it('Exposes a string on the value property', function () {
        const cadence = OfferCadence.create('month');

        assert(typeof cadence.value === 'string');
    });
});
