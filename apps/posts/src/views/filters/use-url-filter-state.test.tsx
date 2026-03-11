import {describe, expect, it, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {useUrlFilterState} from '@src/views/filters/use-url-filter-state';
import type {Filter} from '@tryghost/shade';

const mockUseSearchParams = vi.fn();
const mockSetSearchParams = vi.fn();
const baseFilters: Filter[] = [{id: 'status-1', field: 'status', operator: 'is', values: ['paid']}];

vi.mock('@tryghost/admin-x-framework', () => ({
    useSearchParams: () => mockUseSearchParams()
}));

describe('useUrlFilterState', () => {
    const serializeFilters = (filters: Array<{field: string; operator: string; values: unknown[]}>, search?: string) => {
        const params = new URLSearchParams();
        const filter = filters
            .map(currentFilter => `${currentFilter.field}:${currentFilter.operator}:${currentFilter.values[0]}`)
            .join('+');

        if (filter) {
            params.set('filter', filter);
        }

        if (search) {
            params.set('search', search);
        }

        return params;
    };

    const renderStateHook = ({
        params = new URLSearchParams({
            filter: 'status:is:paid',
            search: 'alex'
        }),
        parseFilters = () => baseFilters
    }: {
        params?: URLSearchParams;
        parseFilters?: () => Filter[];
    } = {}) => {
        mockUseSearchParams.mockReturnValue([params, mockSetSearchParams]);

        return renderHook(() => useUrlFilterState({
            parseFilters,
            serializeFilters,
            buildNql: () => undefined
        }));
    };

    it('resets predicates and search through shared reducer semantics', () => {
        const {result} = renderStateHook();

        act(() => {
            result.current.resetState({replace: false});
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams(), {replace: false});
    });

    it.each([
        {
            title: 'clears predicates through shared reducer semantics while preserving search',
            run: (result: ReturnType<typeof renderStateHook>['result']) => result.current.clearFilters(),
            expected: 'search=alex'
        },
        {
            title: 'updates search through shared reducer semantics while preserving predicates',
            run: (result: ReturnType<typeof renderStateHook>['result']) => result.current.setSearch('jamie'),
            expected: 'filter=status%3Ais%3Apaid&search=jamie'
        },
        {
            title: 'sets predicates through shared reducer semantics while preserving search',
            run: (result: ReturnType<typeof renderStateHook>['result']) => result.current.setFilters(prev => [
                ...prev,
                {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
            ]),
            expected: 'filter=status%3Ais%3Apaid%2Bstatus%3Ais_not%3Afree&search=alex'
        }
    ])('$title', ({run, expected}) => {
        const {result} = renderStateHook();

        act(() => {
            run(result);
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams(expected), {replace: true});
    });

    it('preserves the next predicate order when the payload reorders rows', () => {
        const {result} = renderStateHook({
            params: new URLSearchParams({
                filter: 'status:is:paid+email:contains:alex@example.com',
                search: 'alex'
            }),
            parseFilters: () => [
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
                {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']}
            ]
        });

        act(() => {
            result.current.setFilters([
                {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']},
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
            ]);
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams('filter=email%3Acontains%3Aalex%40example.com%2Bstatus%3Ais%3Apaid&search=alex'), {replace: true});
    });
});
