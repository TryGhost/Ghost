const assert = require('node:assert/strict');
const sinon = require('sinon');
const offer_duration = require('../../../../core/frontend/helpers/offer_duration');
const labs = require('../../../../core/shared/labs');
const logging = require('@tryghost/logging');

describe('{{offer_duration}} helper', function () {
    let labsStub;

    beforeEach(function () {
        labsStub = sinon.stub(labs, 'isSet').returns(true);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('returns empty string when no next_payment', function () {
        const rendered = offer_duration.call({});
        assert.equal(rendered, '');
    });

    it('returns empty string when next_payment has no discount', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 500,
                currency: 'USD',
                interval: 'month',
                discount: null
            }
        });
        assert.equal(rendered, '');
    });

    it('returns "Forever" for forever discount', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 500,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'forever',
                    type: 'percent',
                    amount: 20,
                    start: '2026-01-01T00:00:00.000Z',
                    end: null
                }
            }
        });
        assert.equal(rendered.string, 'Forever');
    });

    it('returns "Ends {date}" for repeating discount using discount.end', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 500,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'repeating',
                    duration_in_months: 3,
                    type: 'percent',
                    amount: 20,
                    start: '2026-01-01T00:00:00.000Z',
                    end: '2026-05-03T00:00:00.000Z'
                }
            },
            current_period_end: '2026-04-03T00:00:00.000Z'
        });
        assert.equal(rendered.string, 'Ends 3 May 2026');
    });

    it('returns "Ends {date}" for once discount using current_period_end', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 500,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'once',
                    type: 'percent',
                    amount: 50,
                    start: '2026-01-01T00:00:00.000Z',
                    end: null
                }
            },
            current_period_end: '2026-04-02T00:00:00.000Z'
        });
        assert.equal(rendered.string, 'Ends 2 Apr 2026');
    });

    it('returns empty string for repeating discount without discount.end', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 500,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'repeating',
                    duration_in_months: 3,
                    type: 'percent',
                    amount: 20,
                    start: '2026-01-01T00:00:00.000Z',
                    end: null
                }
            },
            current_period_end: '2026-04-03T00:00:00.000Z'
        });
        assert.equal(rendered.string, '');
    });

    it('returns empty string for once discount without current_period_end', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 500,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'once',
                    type: 'percent',
                    amount: 50,
                    start: '2026-01-01T00:00:00.000Z',
                    end: null
                }
            }
        });
        assert.equal(rendered.string, '');
    });

    it('handles free months offer (100% off repeating)', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 0,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'repeating',
                    duration_in_months: 3,
                    type: 'percent',
                    amount: 100,
                    start: '2026-01-01T00:00:00.000Z',
                    end: '2026-05-03T00:00:00.000Z'
                }
            },
            current_period_end: '2026-04-03T00:00:00.000Z'
        });
        assert.equal(rendered.string, 'Ends 3 May 2026');
    });

    it('handles fixed discount forever', function () {
        const rendered = offer_duration.call({
            next_payment: {
                amount: 800,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'forever',
                    type: 'fixed',
                    amount: 200,
                    start: '2026-01-01T00:00:00.000Z',
                    end: null
                }
            }
        });
        assert.equal(rendered.string, 'Forever');
    });

    it('is disabled if labs flag is not set', function () {
        labsStub.returns(false);
        const loggingStub = sinon.stub(logging, 'error');

        const rendered = offer_duration.call({
            next_payment: {
                amount: 500,
                currency: 'USD',
                interval: 'month',
                discount: {
                    duration: 'forever',
                    type: 'percent',
                    amount: 20,
                    start: '2026-01-01T00:00:00.000Z',
                    end: null
                }
            }
        });

        assert.match(rendered.string, /^<script/);
        assert.match(rendered.string, /helper is not available/);
        sinon.assert.calledOnce(loggingStub);
    });
});
