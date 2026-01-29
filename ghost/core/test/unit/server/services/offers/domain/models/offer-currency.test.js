const assert = require('node:assert/strict');

const OfferCurrency = require('../../../../../../../core/server/services/offers/domain/models/offer-currency');

describe('OfferCurrency', function () {
    describe('OfferCurrency.create factory', function () {
        it('Will only allow creating a currency with a 3 letter ISO string', function () {
            OfferCurrency.create('USD');
            OfferCurrency.create('gbp');

            assert.throws(() => {
                OfferCurrency.create();
            }, OfferCurrency.InvalidOfferCurrency);

            assert.throws(() => {
                OfferCurrency.create('US Dollars');
            }, OfferCurrency.InvalidOfferCurrency);

            assert.throws(() => {
                OfferCurrency.create('$');
            }, OfferCurrency.InvalidOfferCurrency);

            assert.throws(() => {
                OfferCurrency.create('USDC');
            }, OfferCurrency.InvalidOfferCurrency);

            assert.throws(() => {
                OfferCurrency.create(2);
            }, OfferCurrency.InvalidOfferCurrency);
        });
    });

    it('Store the currency as a string on the value property', function () {
        const currency = OfferCurrency.create('usd');

        assert.equal(typeof currency.value, 'string');
    });

    it('Considers currencies equal if they have the same ISO code', function () {
        const currencyA = OfferCurrency.create('usd');
        const currencyB = OfferCurrency.create('USD');

        assert.ok(currencyA.equals(currencyB));
    });
});