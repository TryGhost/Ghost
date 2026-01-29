const assert = require('node:assert/strict');

const OfferStatus = require('../../../../../../../core/server/services/offers/domain/models/offer-status');

describe('OfferStatus', function () {
    describe('OfferStatus.create factory', function () {
        it('Creates an Offer type containing either "active" or "archived"', function () {
            OfferStatus.create('active');
            OfferStatus.create('archived');

            assert.throws(() => {
                OfferStatus.create('other');
            }, OfferStatus.InvalidOfferStatus);

            assert.throws(() => {
                OfferStatus.create();
            }, OfferStatus.InvalidOfferStatus);
        });
    });
});