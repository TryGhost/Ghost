const assert = require('node:assert/strict');
const should = require('should');

const OfferCurrency = require('../../../../../../../core/server/services/offers/domain/models/offer-currency');

describe('OfferCurrency', function () {
    describe('OfferCurrency.create factory', function () {
        it('Will only allow creating a currency with a 3 letter ISO string', function () {
            OfferCurrency.create('USD');
            OfferCurrency.create('gbp');

            try {
                OfferCurrency.create();
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCurrency.InvalidOfferCurrency, 'expected an InvalidOfferCurrency error');
            }

            try {
                OfferCurrency.create('US Dollars');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCurrency.InvalidOfferCurrency, 'expected an InvalidOfferCurrency error');
            }

            try {
                OfferCurrency.create('$');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCurrency.InvalidOfferCurrency, 'expected an InvalidOfferCurrency error');
            }

            try {
                OfferCurrency.create('USDC');
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCurrency.InvalidOfferCurrency, 'expected an InvalidOfferCurrency error');
            }

            try {
                OfferCurrency.create(2);
                assert.fail();
            } catch (err) {
                assert(err instanceof OfferCurrency.InvalidOfferCurrency, 'expected an InvalidOfferCurrency error');
            }
        });
    });

    it('Store the currency as a string on the value property', function () {
        const currency = OfferCurrency.create('usd');

        assert.equal(typeof currency.value, 'string');
    });

    it('Considers currencies equal if they have the same ISO code', function () {
        const currencyA = OfferCurrency.create('usd');
        const currencyB = OfferCurrency.create('USD');

        assert(currencyA.equals(currencyB));
    });
});

