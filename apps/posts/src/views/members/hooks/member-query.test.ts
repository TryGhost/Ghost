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

    it('adds subscription includes when active filters require subscription columns', () => {
        const params = buildMembersQueryParams({
            filter: 'subscriptions.status:active',
            filters: [
                {
                    id: 'subscriptions-status-1',
                    field: 'subscriptions.status',
                    operator: 'is',
                    values: ['active']
                }
            ]
        });

        expect(params).toEqual({
            include: 'labels,tiers,subscriptions',
            limit: '50',
            order: 'created_at desc',
            filter: 'subscriptions.status:active'
        });
    });
});
