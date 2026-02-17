const assert = require('node:assert/strict');
const should = require('should');

const OfferDuration = require('../../../../../../../core/server/services/offers/domain/models/offer-duration');

describe('OfferDuration', function () {
    describe('OfferDuration.create factory', function () {
        it('Will only allow creating a once, repeating, forever, trial or free_months duration', function () {
            OfferDuration.create('once');
            OfferDuration.create('forever');
            OfferDuration.create('trial');
            OfferDuration.create('free_months');
            OfferDuration.create('repeating', 2);

            try {
                OfferDuration.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDuration.InvalidOfferDuration, 'expected an InvalidOfferDuration error');
            }

            try {
                OfferDuration.create('other');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDuration.InvalidOfferDuration, 'expected an InvalidOfferDuration error');
            }

            try {
                OfferDuration.create('repeating');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDuration.InvalidOfferDuration, 'expected an InvalidOfferDuration error');
            }

            try {
                OfferDuration.create('repeating', 1.5);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDuration.InvalidOfferDuration, 'expected an InvalidOfferDuration error');
            }

            try {
                OfferDuration.create('repeating', -12);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDuration.InvalidOfferDuration, 'expected an InvalidOfferDuration error');
            }

            try {
                OfferDuration.create('repeating', '2');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferDuration.InvalidOfferDuration, 'expected an InvalidOfferDuration error');
            }
        });
    });
});
