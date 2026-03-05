import {describe, expect, it} from 'vitest';
import {buildMembersQueryParams} from '@src/views/members/hooks/member-query';

describe('buildMembersQueryParams', () => {
    it('includes both filter and search for members queries', () => {
        const params = buildMembersQueryParams({
            filter: 'status:paid',
            search: 'alex'
        });

        expect(params).toEqual({
            include: 'labels,tiers',
            limit: '50',
            order: 'created_at desc',
            filter: 'status:paid',
            search: 'alex'
        });
    });
});
