const assert = require('node:assert/strict');
const should = require('should');

const OfferStatus = require('../../../../../../../core/server/services/offers/domain/models/offer-status');

describe('OfferStatus', function () {
    describe('OfferStatus.create factory', function () {
        it('Creates an Offer type containing either "active" or "archived"', function () {
            OfferStatus.create('active');
            OfferStatus.create('archived');

            try {
                OfferStatus.create('other');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferStatus.InvalidOfferStatus, 'expected an InvalidOfferStatus error');
            }

            try {
                OfferStatus.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferStatus.InvalidOfferStatus, 'expected an InvalidOfferStatus error');
            }
        });
    });
});

