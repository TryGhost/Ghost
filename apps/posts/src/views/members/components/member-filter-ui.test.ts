import {describe, expect, it} from 'vitest';
import {buildMemberFilterUiState, restoreMemberFiltersFromUi} from './member-filter-ui';
import type {Filter, FilterFieldGroup} from '@tryghost/shade';

describe('member-filter-ui', () => {
    it('hides single-instance fields from the picker once active', () => {
        const fieldGroups: FilterFieldGroup[] = [
            {
                group: 'Basic',
                fields: [
                    {
                        key: 'label',
                        label: 'Label',
                        type: 'select',
                        options: []
                    },
                    {
                        key: 'created_at',
                        label: 'Created',
                        type: 'date'
                    }
                ]
            }
        ];

        const filters: Filter[] = [
            {
                id: 'label-1',
                field: 'label',
                operator: 'is_any_of',
                values: ['vip']
            }
        ];

        const uiState = buildMemberFilterUiState({fieldGroups, filters});

        expect(uiState.displayGroups[0].fields.map(field => field.key)).toEqual([
            'label__row__label-1',
            'created_at'
        ]);
        expect(uiState.displayFilters).toEqual([
            {
                id: 'label-1',
                field: 'label__row__label-1',
                operator: 'is_any_of',
                values: ['vip']
            }
        ]);
        expect(restoreMemberFiltersFromUi(uiState.displayFilters, uiState.fieldKeyMap)).toEqual(filters);
    });

    it('keeps duplicate-capable fields addable while preserving active rows', () => {
        const fieldGroups: FilterFieldGroup[] = [
            {
                group: 'Basic',
                fields: [
                    {
                        key: 'created_at',
                        label: 'Created',
                        type: 'date'
                    }
                ]
            }
        ];

        const filters: Filter[] = [
            {
                id: 'created-1',
                field: 'created_at',
                operator: 'is-or-greater',
                values: ['2024-01-01']
            }
        ];

        const uiState = buildMemberFilterUiState({fieldGroups, filters});

        expect(uiState.displayGroups[0].fields.map(field => field.key)).toEqual([
            'created_at__row__created-1',
            'created_at'
        ]);
        expect(uiState.displayFilters[0].field).toBe('created_at__row__created-1');
        expect(restoreMemberFiltersFromUi([
            ...uiState.displayFilters,
            {
                id: 'created-2',
                field: 'created_at',
                operator: 'is-or-less',
                values: ['2024-12-31']
            }
        ], uiState.fieldKeyMap)).toEqual([
            filters[0],
            {
                id: 'created-2',
                field: 'created_at',
                operator: 'is-or-less',
                values: ['2024-12-31']
            }
        ]);
    });

    it('keeps multiple active rows of the same duplicate-capable field distinct', () => {
        const fieldGroups: FilterFieldGroup[] = [
            {
                group: 'Basic',
                fields: [
                    {
                        key: 'created_at',
                        label: 'Created',
                        type: 'date'
                    }
                ]
            }
        ];

        const filters: Filter[] = [
            {
                id: 'created-1',
                field: 'created_at',
                operator: 'is-or-greater',
                values: ['2024-01-01']
            },
            {
                id: 'created-2',
                field: 'created_at',
                operator: 'is-or-less',
                values: ['2024-12-31']
            }
        ];

        const uiState = buildMemberFilterUiState({fieldGroups, filters});

        expect(uiState.displayGroups[0].fields.map(field => field.key)).toEqual([
            'created_at__row__created-1',
            'created_at__row__created-2',
            'created_at'
        ]);
        expect(uiState.displayFilters.map(filter => filter.field)).toEqual([
            'created_at__row__created-1',
            'created_at__row__created-2'
        ]);
        expect(restoreMemberFiltersFromUi(uiState.displayFilters, uiState.fieldKeyMap)).toEqual(filters);
    });
});
