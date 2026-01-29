const assert = require('node:assert/strict');

const OfferDuration = require('../../../../../../../core/server/services/offers/domain/models/offer-duration');

describe('OfferDuration', function () {
    describe('OfferDuration.create factory', function () {
        it('Will only allow creating a once, repeating or forever duration', function () {
            OfferDuration.create('once');
            OfferDuration.create('forever');
            OfferDuration.create('trial');
            OfferDuration.create('repeating', 2);

            assert.throws(() => {
                OfferDuration.create();
            }, OfferDuration.InvalidOfferDuration);

            assert.throws(() => {
                OfferDuration.create('other');
            }, OfferDuration.InvalidOfferDuration);

            assert.throws(() => {
                OfferDuration.create('repeating');
            }, OfferDuration.InvalidOfferDuration);

            assert.throws(() => {
                OfferDuration.create('repeating', 1.5);
            }, OfferDuration.InvalidOfferDuration);

            assert.throws(() => {
                OfferDuration.create('repeating', -12);
            }, OfferDuration.InvalidOfferDuration);

            assert.throws(() => {
                OfferDuration.create('repeating', '2');
            }, OfferDuration.InvalidOfferDuration);
        });
    });
});