const OfferStatus = require('../../../../lib/domain/models/OfferStatus');

describe('OfferStatus', function () {
    describe('OfferStatus.create factory', function () {
        it('Creates an Offer type containing either "active" or "archived"', function () {
            OfferStatus.create('active');
            OfferStatus.create('archived');

            try {
                OfferStatus.create('other');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferStatus.InvalidOfferStatus,
                    'expected an InvalidOfferStatus error'
                );
            }

            try {
                OfferStatus.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferStatus.InvalidOfferStatus,
                    'expected an InvalidOfferStatus error'
                );
            }
        });
    });
});

