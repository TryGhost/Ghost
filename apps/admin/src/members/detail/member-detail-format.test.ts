import {describe, expect, it} from 'vitest';
import {formatAddressValue, formatMemberLocation, getMemberReferrerSource, parseMemberGeolocation} from './member-detail-format';

describe('parseMemberGeolocation', () => {
    it('returns null for missing input', () => {
        expect(parseMemberGeolocation(null)).toBeNull();
        expect(parseMemberGeolocation(undefined)).toBeNull();
        expect(parseMemberGeolocation('')).toBeNull();
    });

    it('returns null for unparseable JSON', () => {
        expect(parseMemberGeolocation('not json')).toBeNull();
    });

    it('returns null when the JSON is not an object', () => {
        expect(parseMemberGeolocation('42')).toBeNull();
        expect(parseMemberGeolocation('"US"')).toBeNull();
        expect(parseMemberGeolocation('null')).toBeNull();
        expect(parseMemberGeolocation('true')).toBeNull();
    });

    it('rejects arrays (which are typeof "object")', () => {
        expect(parseMemberGeolocation('[1,2]')).toBeNull();
    });

    it('parses a geolocation JSON string into an object', () => {
        expect(parseMemberGeolocation('{"country":"Turkey","country_code":"TR","region":"Izmir"}'))
            .toEqual({country: 'Turkey', country_code: 'TR', region: 'Izmir'});
    });
});

describe('formatMemberLocation', () => {
    it('shows "Unknown location" when geolocation is missing or unparseable', () => {
        expect(formatMemberLocation(null)).toBe('Unknown location');
        expect(formatMemberLocation('nonsense')).toBe('Unknown location');
    });

    it('shows "Region, US" for US members that have a region', () => {
        expect(formatMemberLocation('{"country":"United States","country_code":"US","region":"California"}'))
            .toBe('California, US');
    });

    it('shows the country for non-US members', () => {
        expect(formatMemberLocation('{"country":"Germany","country_code":"DE","region":"Berlin"}'))
            .toBe('Germany');
    });

    it('shows the country for a US member that has no region', () => {
        // Regression guard: US-without-region must fall through to the country, not "US".
        expect(formatMemberLocation('{"country":"United States","country_code":"US"}'))
            .toBe('United States');
    });

    it('falls back to "Unknown location" when a US member has neither region nor country', () => {
        expect(formatMemberLocation('{"country_code":"US"}')).toBe('Unknown location');
    });

    it('falls back to "Unknown location" for an empty object', () => {
        expect(formatMemberLocation('{}')).toBe('Unknown location');
    });

    it('falls back to "Unknown location" when the country is absent', () => {
        expect(formatMemberLocation('{"region":"Somewhere"}')).toBe('Unknown location');
    });
});

describe('getMemberReferrerSource', () => {
    it('returns null when there is no attribution or source', () => {
        expect(getMemberReferrerSource(null)).toBeNull();
        expect(getMemberReferrerSource(undefined)).toBeNull();
        expect(getMemberReferrerSource({})).toBeNull();
        expect(getMemberReferrerSource({referrer_source: ''})).toBeNull();
    });

    it('returns the referrer source when present', () => {
        expect(getMemberReferrerSource({referrer_source: 'Twitter'})).toBe('Twitter');
    });

    it('hides the "Created manually" placeholder source', () => {
        // Mirrors the Ember gh-member-details referrerSource getter.
        expect(getMemberReferrerSource({referrer_source: 'Created manually'})).toBeNull();
    });
});

describe('formatAddressValue', () => {
    it('formats a full address as one readable line', () => {
        expect(formatAddressValue({line1: '1 Main St', line2: '12 apt B', city: 'New York', state: 'NY', postal_code: '00001', country: 'US'}))
            .toBe('1 Main St, 12 apt B, New York, NY 00001, US');
    });

    it('pairs state and postal code, and drops missing sub-fields cleanly', () => {
        expect(formatAddressValue({line1: '1 Main St', city: 'Berlin', postal_code: '10115', country: 'DE'}))
            .toBe('1 Main St, Berlin, 10115, DE');
        expect(formatAddressValue({city: 'Berlin'})).toBe('Berlin');
    });

    it('formats an empty address as an empty string', () => {
        expect(formatAddressValue({})).toBe('');
    });
});
