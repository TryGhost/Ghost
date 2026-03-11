import {describe, expect, it} from 'vitest';
import {deriveMemberFilterMetadata} from './member-filter-metadata';
import type {MemberPredicate} from '@src/views/filters/member-fields';

describe('deriveMemberFilterMetadata', () => {
    it('derives extra subscription columns and includes from active filters', () => {
        const filters: MemberPredicate[] = [
            {
                id: 'subscriptions-status-1',
                field: 'subscriptions.status',
                operator: 'is',
                values: ['active']
            }
        ];

        expect(deriveMemberFilterMetadata(filters)).toEqual({
            activeFields: ['subscriptions.status'],
            activeColumns: [
                {
                    key: 'subscriptions.status',
                    label: 'Stripe subscription status',
                    include: 'subscriptions'
                }
            ],
            requiredIncludes: ['subscriptions']
        });
    });

    it('does not add extra columns for fields already covered by base table cells', () => {
        const filters: MemberPredicate[] = [
            {
                id: 'name-1',
                field: 'name',
                operator: 'contains',
                values: ['alex']
            }
        ];

        expect(deriveMemberFilterMetadata(filters)).toEqual({
            activeFields: ['name'],
            activeColumns: [],
            requiredIncludes: []
        });
    });
});
