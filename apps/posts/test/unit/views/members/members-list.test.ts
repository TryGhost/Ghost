import {describe, expect, it} from 'vitest';

import {buildMemberDetailHash} from '@src/views/members/member-detail-hash';

describe('buildMemberDetailHash', () => {
    it('preserves the current members list URL in the member detail hash', () => {
        expect(buildMemberDetailHash('member-id', '/members?filter=label%3A%5BVIP%5D&search=alice'))
            .toBe('/members/member-id?back=%2Fmembers%3Ffilter%3Dlabel%253A%255BVIP%255D%26search%3Dalice');
    });

    it('returns the member detail hash without a back path when none is provided', () => {
        expect(buildMemberDetailHash('member-id')).toBe('/members/member-id');
    });
});
