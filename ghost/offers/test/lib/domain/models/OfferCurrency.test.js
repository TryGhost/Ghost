const OfferCurrency = require('../../../../lib/domain/models/OfferCurrency');

describe('OfferCurrency', function () {
    describe('OfferCurrency.create factory', function () {
        it('Will only allow creating a currency with a 3 letter ISO string', function () {
            OfferCurrency.create('USD');
            OfferCurrency.create('gbp');

            try {
                OfferCurrency.create();
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCurrency.InvalidOfferCurrency,
                    'expected an InvalidOfferCurrency error'
                );
            }

            try {
                OfferCurrency.create('US Dollars');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCurrency.InvalidOfferCurrency,
                    'expected an InvalidOfferCurrency error'
                );
            }

            try {
                OfferCurrency.create('$');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCurrency.InvalidOfferCurrency,
                    'expected an InvalidOfferCurrency error'
                );
            }

            try {
                OfferCurrency.create('USDC');
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCurrency.InvalidOfferCurrency,
                    'expected an InvalidOfferCurrency error'
                );
            }

            try {
                OfferCurrency.create(2);
                should.fail();
            } catch (err) {
                should.ok(
                    err instanceof OfferCurrency.InvalidOfferCurrency,
                    'expected an InvalidOfferCurrency error'
                );
            }
        });
    });

    it('Store the currency as a string on the value property', function () {
        const currency = OfferCurrency.create('usd');

        should.equal(typeof currency.value, 'string');
    });

    it('Considers currencies equal if they have the same ISO code', function () {
        const currencyA = OfferCurrency.create('usd');
        const currencyB = OfferCurrency.create('USD');

        should.ok(currencyA.equals(currencyB));
    });
});

