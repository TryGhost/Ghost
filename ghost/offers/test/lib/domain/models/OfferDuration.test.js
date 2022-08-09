const OfferDuration = require('../../../../lib/domain/models/OfferDuration');

describe('OfferDuration', function () {
    describe('OfferDuration.create factory', function () {
        it('Will only allow creating a once, repeating or forever duration', function () {
            OfferDuration.create('once');
            OfferDuration.create('forever');
            OfferDuration.create('trial');
            OfferDuration.create('repeating', 2);

            try {
                OfferDuration.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDuration.InvalidOfferDuration,
                    'expected an InvalidOfferDuration error'
                );
            }

            try {
                OfferDuration.create('other');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDuration.InvalidOfferDuration,
                    'expected an InvalidOfferDuration error'
                );
            }

            try {
                OfferDuration.create('repeating');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDuration.InvalidOfferDuration,
                    'expected an InvalidOfferDuration error'
                );
            }

            try {
                OfferDuration.create('repeating', 1.5);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDuration.InvalidOfferDuration,
                    'expected an InvalidOfferDuration error'
                );
            }

            try {
                OfferDuration.create('repeating', -12);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDuration.InvalidOfferDuration,
                    'expected an InvalidOfferDuration error'
                );
            }

            try {
                OfferDuration.create('repeating', '2');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferDuration.InvalidOfferDuration,
                    'expected an InvalidOfferDuration error'
                );
            }
        });
    });
});
