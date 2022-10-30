const should = require('should');
const price = require('../../../../core/frontend/helpers/price');

const {registerHelper, shouldCompileToError, shouldCompileToExpected} = require('./utils/handlebars');

describe('{{price}} helper', function () {
    before(function () {
        registerHelper('price');
    });

    it('throws an error for no provided parameters', function () {
        const templateString = '{{price}}';

        shouldCompileToError(templateString, {}, {
            name: 'IncorrectUsageError'
        });
    });

    it('throws an error for undefined parameter', function () {
        const templateString = '{{price @dont.exist}}';

        shouldCompileToError(templateString, {}, {
            name: 'IncorrectUsageError'
        });
    });

    it('throws if argument is not a number', function () {
        const templateString = '{{price "not_a_number"}}';
        shouldCompileToError(templateString, {}, {
            name: 'IncorrectUsageError'
        });
    });

    it('will format decimal adjusted amount', function () {
        const templateString = '{{price 2000}}';

        shouldCompileToExpected(templateString, {}, '20');
    });

    it('will format with plan object', function () {
        const plan = {
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            currency: 'USD',
            currency_symbol: '$'
        };
        const rendered = price.call({}, plan, {});
        rendered.should.be.equal('$5');
    });

    it('will format with plan object with number format', function () {
        const plan = {
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            currency: 'USD',
            currency_symbol: '$'
        };
        const rendered = price.call({}, plan, {hash: {numberFormat: 'long'}});
        rendered.should.be.equal('$5.00');
    });

    it('will format symbol if only currency - USD', function () {
        const rendered = price.call({}, {hash: {currency: 'USD'}});
        rendered.should.be.equal('$');
    });

    it('will format symbol if only currency - EUR', function () {
        const rendered = price.call({}, {hash: {currency: 'EUR'}});
        rendered.should.be.equal('€');
    });

    it('will format with amount and currency', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'USD'}});
        rendered.should.be.equal('$5');
    });

    it('will format with long number format', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'USD', numberFormat: 'long'}});
        rendered.should.be.equal('$5.00');
    });

    it('will format with short number format with decimal value', function () {
        const rendered = price.call({}, 505, {hash: {currency: 'EUR', numberFormat: 'short'}});
        rendered.should.be.equal('€5.05');
    });

    it('will format with short number format without decimal value', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'EUR', numberFormat: 'short'}});
        rendered.should.be.equal('€5');
    });

    it('will format with name currency format', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'USD', currencyFormat: 'name'}});
        rendered.should.be.equal('5 US dollars');
    });
});
