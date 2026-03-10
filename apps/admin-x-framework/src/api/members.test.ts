import {describe, expect, it} from 'vitest';
import {buildBulkMemberSearchParams} from './members';

describe('buildBulkMemberSearchParams', () => {
    it('supports search-only member selections', () => {
        expect(buildBulkMemberSearchParams({search: 'alex'})).toEqual({
            search: 'alex'
        });
    });

    it('preserves combined filter and search selections', () => {
        expect(buildBulkMemberSearchParams({
            filter: 'status:paid',
            search: 'alex'
        })).toEqual({
            filter: 'status:paid',
            search: 'alex'
        });
    });

    it('supports explicit all-member operations', () => {
        expect(buildBulkMemberSearchParams({all: true})).toEqual({
            all: 'true'
        });
    });
});
