import {describe, expect, it} from 'vitest';
import {buildMemberNqlFilter} from '@src/views/members/hooks/use-members-filter-state';
import type {Filter} from '@tryghost/shade';

describe('members nql compatibility', () => {
    it('serializes subscribed=is:subscribed to ember-compatible nql', () => {
        const filters: Filter[] = [
            {
                id: 'subscribed-1',
                field: 'subscribed',
                operator: 'is',
                values: ['subscribed']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(subscribed:true+email_disabled:0)');
    });

    it('serializes created_at is-or-less with ember day-end boundary', () => {
        const filters: Filter[] = [
            {
                id: 'created-at-1',
                field: 'created_at',
                operator: 'is-or-less',
                values: ['2022-02-01']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('created_at:<=\'2022-02-01 23:59:59\'');
    });

    it('serializes created_at is-or-greater with ember timezone-adjusted UTC boundary', () => {
        const filters: Filter[] = [
            {
                id: 'created-at-2',
                field: 'created_at',
                operator: 'is-or-greater',
                values: ['2022-02-22']
            }
        ];

        expect(buildMemberNqlFilter(filters, {timezone: 'America/New_York'})).toBe('created_at:>=\'2022-02-22 05:00:00\'');
    });
});
