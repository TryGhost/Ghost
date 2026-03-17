import {
    buildMemberListSearchParams,
    buildMemberOperationParams
} from './member-query-params';
import {describe, expect, it} from 'vitest';
import type {Filter} from '@tryghost/shade';

describe('member-query-params', () => {
    it('keeps search separate while deriving includes from active field metadata', () => {
        const filters: Filter[] = [
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
            limit: '50',
            order: 'created_at desc',
            filter: 'label:[vip]+subscriptions.status:active',
            search: 'jamie'
        });
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
