const assert = require('node:assert/strict');
const sinon = require('sinon');
const price = require('../../../../core/frontend/helpers/price');

const {registerHelper, shouldCompileToExpected} = require('./utils/handlebars');

const logging = require('@tryghost/logging');

describe('{{price}} helper', function () {
    let logWarnStub;

    beforeEach(function () {
        logWarnStub = sinon.stub(logging, 'warn');
    });

    afterEach(function () {
        sinon.restore();
    });

    before(function () {
        registerHelper('price');
    });

    it('throws an error for no provided parameters', function () {
        const templateString = '{{price}}';

        shouldCompileToExpected(templateString, {}, '');
        sinon.assert.calledOnce(logWarnStub);
    });

    it('throws an error for undefined parameter', function () {
        const templateString = '{{price @dont.exist}}';

        shouldCompileToExpected(templateString, {}, '');
        sinon.assert.calledOnce(logWarnStub);
    });

    it('throws if argument is not a number', function () {
        const templateString = '{{price "not_a_number"}}';

        shouldCompileToExpected(templateString, {}, '');
        sinon.assert.calledOnce(logWarnStub);
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
        assert.equal(rendered, '$5');
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
        assert.equal(rendered, '$5.00');
    });

    it('will format symbol if only currency - USD', function () {
        const rendered = price.call({}, {hash: {currency: 'USD'}});
        assert.equal(rendered, '$');
    });

    it('will format symbol if only currency - EUR', function () {
        const rendered = price.call({}, {hash: {currency: 'EUR'}});
        assert.equal(rendered, '€');
    });

    it('will format with amount and currency', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'USD'}});
        assert.equal(rendered, '$5');
    });

    it('will format with long number format', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'USD', numberFormat: 'long'}});
        assert.equal(rendered, '$5.00');
    });

    it('will format with short number format with decimal value', function () {
        const rendered = price.call({}, 505, {hash: {currency: 'EUR', numberFormat: 'short'}});
        assert.equal(rendered, '€5.05');
    });

    it('will format with short number format without decimal value', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'EUR', numberFormat: 'short'}});
        assert.equal(rendered, '€5');
    });

    it('will format with name currency format', function () {
        const rendered = price.call({}, 500, {hash: {currency: 'USD', currencyFormat: 'name'}});
        assert.equal(rendered, '5 US dollars');
    });

    describe('interval option', function () {
        it('will append interval when interval="true" and plan has interval', function () {
            const plan = {
                amount: 500,
                interval: 'month',
                currency: 'USD'
            };
            const rendered = price.call({}, plan, {hash: {interval: 'true'}});
            assert.equal(rendered, '$5/month');
        });

        it('will append yearly interval', function () {
            const plan = {
                amount: 5000,
                interval: 'year',
                currency: 'USD'
            };
            const rendered = price.call({}, plan, {hash: {interval: 'true'}});
            assert.equal(rendered, '$50/year');
        });

        it('will append interval when interval is boolean true', function () {
            const plan = {
                amount: 500,
                interval: 'month',
                currency: 'USD'
            };
            const rendered = price.call({}, plan, {hash: {interval: true}});
            assert.equal(rendered, '$5/month');
        });

        it('will not append interval when interval is not set', function () {
            const plan = {
                amount: 500,
                interval: 'month',
                currency: 'USD'
            };
            const rendered = price.call({}, plan, {hash: {}});
            assert.equal(rendered, '$5');
        });

        it('will not append interval when interval is "false"', function () {
            const plan = {
                amount: 500,
                interval: 'month',
                currency: 'USD'
            };
            const rendered = price.call({}, plan, {hash: {interval: 'false'}});
            assert.equal(rendered, '$5');
        });

        it('will not append interval when plan has no interval property', function () {
            const plan = {
                amount: 500,
                currency: 'USD'
            };
            const rendered = price.call({}, plan, {hash: {interval: 'true'}});
            assert.equal(rendered, '$5');
        });

        it('will work with next_payment object', function () {
            const nextPayment = {
                amount: 800,
                interval: 'month',
                currency: 'USD'
            };
            const rendered = price.call({}, nextPayment, {hash: {interval: 'true'}});
            assert.equal(rendered, '$8/month');
        });

        it('will work with long number format and interval', function () {
            const plan = {
                amount: 500,
                interval: 'month',
                currency: 'USD'
            };
            const rendered = price.call({}, plan, {hash: {interval: 'true', numberFormat: 'long'}});
            assert.equal(rendered, '$5.00/month');
        });
    });
});
