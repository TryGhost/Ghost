import {describe, expect, it, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {useUrlFilterState} from '@src/views/filters/use-url-filter-state';

const mockUseSearchParams = vi.fn();
const mockSetSearchParams = vi.fn();

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

    it('resets predicates and search through shared reducer semantics', () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                filter: 'status:is:paid',
                search: 'alex'
            }),
            mockSetSearchParams
        ]);

        const {result} = renderHook(() => useUrlFilterState({
            parseFilters: () => [{id: 'status-1', field: 'status', operator: 'is', values: ['paid']}],
            serializeFilters,
            buildNql: () => undefined
        }));

        act(() => {
            result.current.resetState({replace: false});
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams(), {replace: false});
    });

    it('clears predicates through shared reducer semantics while preserving search', () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                filter: 'status:is:paid',
                search: 'alex'
            }),
            mockSetSearchParams
        ]);

        const {result} = renderHook(() => useUrlFilterState({
            parseFilters: () => [{id: 'status-1', field: 'status', operator: 'is', values: ['paid']}],
            serializeFilters,
            buildNql: () => undefined
        }));

        act(() => {
            result.current.clearFilters();
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams('search=alex'), {replace: true});
    });

    it('updates search through shared reducer semantics while preserving predicates', () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                filter: 'status:is:paid',
                search: 'alex'
            }),
            mockSetSearchParams
        ]);

        const {result} = renderHook(() => useUrlFilterState({
            parseFilters: () => [{id: 'status-1', field: 'status', operator: 'is', values: ['paid']}],
            serializeFilters,
            buildNql: () => undefined
        }));

        act(() => {
            result.current.setSearch('jamie');
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams('filter=status%3Ais%3Apaid&search=jamie'), {replace: true});
    });

    it('sets predicates through shared reducer semantics while preserving search', () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                filter: 'status:is:paid',
                search: 'alex'
            }),
            mockSetSearchParams
        ]);

        const {result} = renderHook(() => useUrlFilterState({
            parseFilters: () => [{id: 'status-1', field: 'status', operator: 'is', values: ['paid']}],
            serializeFilters,
            buildNql: () => undefined
        }));

        act(() => {
            result.current.setFilters(prev => [
                ...prev,
                {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
            ]);
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams('filter=status%3Ais%3Apaid%2Bstatus%3Ais_not%3Afree&search=alex'), {replace: true});
    });

    it('preserves the next predicate order when the payload reorders rows', () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                filter: 'status:is:paid+email:contains:alex@example.com',
                search: 'alex'
            }),
            mockSetSearchParams
        ]);

        const {result} = renderHook(() => useUrlFilterState({
            parseFilters: () => [
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
                {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']}
            ],
            serializeFilters,
            buildNql: () => undefined
        }));

        act(() => {
            result.current.setFilters([
                {id: 'email-1', field: 'email', operator: 'contains', values: ['alex@example.com']},
                {id: 'status-1', field: 'status', operator: 'is', values: ['paid']}
            ]);
        });

        expect(mockSetSearchParams).toHaveBeenCalledWith(new URLSearchParams('filter=email%3Acontains%3Aalex%40example.com%2Bstatus%3Ais%3Apaid&search=alex'), {replace: true});
    });
});
