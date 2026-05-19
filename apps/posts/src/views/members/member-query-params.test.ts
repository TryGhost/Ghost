import {
    buildMemberListSearchParams,
    buildMemberOperationParams,
    getMemberActiveColumns
} from './member-query-params';
import {describe, expect, it} from 'vitest';
import type {FilterPredicate} from '../filters/filter-types';

describe('member-query-params', () => {
    it('keeps search separate while deriving includes from active field metadata', () => {
        const filters: FilterPredicate[] = [
            {
                id: '1',
                field: 'subscriptions.status',
                operator: 'is',
                values: ['active']
            },
            {
                id: '2',
                field: 'label',
                operator: 'is-any',
                values: ['vip']
            }
        ];

        expect(buildMemberListSearchParams({
            filters,
            nql: 'label:[vip]+subscriptions.status:active',
            search: 'jamie'
        })).toEqual({
            include: 'labels,tiers,subscriptions',
            limit: '100',
            order: 'created_at desc',
            filter: 'label:[vip]+subscriptions.status:active',
            search: 'jamie'
        });
    });

    it('derives active columns from field metadata without a separate map', () => {
        const filters: FilterPredicate[] = [
            {
                id: '1',
                field: 'label',
                operator: 'is-any',
                values: ['vip']
            },
            {
                id: '2',
                field: 'subscriptions.current_period_end',
                operator: 'is-or-less',
                values: ['2024-01-01']
            }
        ];

        expect(getMemberActiveColumns(filters)).toEqual([
            {
                key: 'labels',
                label: 'Labels',
                include: 'labels'
            },
            {
                key: 'subscriptions.current_period_end',
                label: 'Next billing date',
                include: 'subscriptions'
            }
        ]);
    });

    it('builds member operation params for filtered, searched, and unscoped actions', () => {
        expect(buildMemberOperationParams({
            nql: 'status:paid',
            search: 'jamie'
        })).toEqual({
            filter: 'status:paid',
            search: 'jamie'
        });

        expect(buildMemberOperationParams({
            nql: undefined,
            search: 'jamie'
        })).toEqual({
            search: 'jamie'
        });

        expect(buildMemberOperationParams({
            nql: undefined,
            search: ''
        })).toEqual({
            all: true
        });
    });
});
