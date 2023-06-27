import * as helpers from './helpers';

describe('formatNumber', function () {
    it('adds commas to large numbers', function () {
        expect(helpers.formatNumber(1234567)).toEqual('1,234,567');
    });

    it('handles 0', function () {
        expect(helpers.formatNumber(0)).toEqual('0');
    });

    it('handles undefined', function () {
        expect((helpers.formatNumber as any)()).toEqual('');
    });

    it('handles null', function () {
        expect((helpers.formatNumber as any)(null)).toEqual('');
    });
});
