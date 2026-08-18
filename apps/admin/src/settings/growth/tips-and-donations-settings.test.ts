import {describe, expect, it} from 'vitest';
import {parseTipsAndDonationsSettings} from './tips-and-donations-settings';

describe('parseTipsAndDonationsSettings', () => {
    it('uses safe defaults when an older backend omits donation settings', () => {
        expect(parseTipsAndDonationsSettings({})).toEqual({
            donations_currency: 'USD',
            donations_suggested_amount: 500
        });
    });

    it.each([
        {amount: 725, description: 'a backend number'},
        {amount: '725', description: 'a dirty local string'}
    ])('accepts the suggested amount as $description', ({amount}) => {
        expect(parseTipsAndDonationsSettings({
            donations_currency: 'EUR',
            donations_suggested_amount: amount
        })).toEqual({
            donations_currency: 'EUR',
            donations_suggested_amount: 725
        });
    });

    it.each([
        {
            settings: {donations_currency: 'ZZZ', donations_suggested_amount: 500},
            description: 'an unsupported currency'
        },
        {
            settings: {donations_currency: null, donations_suggested_amount: 500},
            description: 'a null currency'
        },
        {
            settings: {donations_currency: 'GBP', donations_suggested_amount: 'not-a-number'},
            description: 'a malformed amount'
        },
        {
            settings: {donations_currency: 'GBP', donations_suggested_amount: null},
            description: 'a null amount'
        }
    ])('rejects $description instead of applying a missing-value default', ({settings}) => {
        expect(() => parseTipsAndDonationsSettings(settings)).toThrow();
    });

    it.each([null, [], 'invalid'])('rejects a non-object settings payload', (settings) => {
        expect(() => parseTipsAndDonationsSettings(settings)).toThrow();
    });

    it.each([
        {amount: -1, description: 'a negative amount'},
        {amount: 1.5, description: 'a fractional amount'},
        {amount: NaN, description: 'a NaN amount'},
        {amount: Infinity, description: 'a positive infinite amount'},
        {amount: -Infinity, description: 'a negative infinite amount'},
        {amount: Number.MAX_SAFE_INTEGER + 1, description: 'an unsafe integer amount'},
        {amount: '9007199254740992', description: 'an overflowing digit-only amount'}
    ])('rejects $description', ({amount}) => {
        expect(() => parseTipsAndDonationsSettings({
            donations_currency: 'USD',
            donations_suggested_amount: amount
        })).toThrow();
    });
});
