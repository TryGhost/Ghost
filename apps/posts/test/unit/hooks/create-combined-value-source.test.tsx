import {FilterOption, ValueSourceState} from '@tryghost/shade/patterns';
import {createCombinedValueSource} from '@src/hooks/filter-sources/create-combined-value-source';
import {describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

const firstOptions: FilterOption<string>[] = [
    {value: 'post-1', label: 'Post 1'},
    {value: 'post-2', label: 'Post 2'}
];

const secondOptions: FilterOption<string>[] = [
    {value: 'page-1', label: 'Page 1'},
    {value: 'page-2', label: 'Page 2'}
];

function buildState(options: FilterOption<string>[], overrides: Partial<ValueSourceState<string>> = {}): ValueSourceState<string> {
    return {
        options,
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {},
        ...overrides
    };
}

describe('createCombinedValueSource', () => {
    it('orders first source options before second source options', () => {
        const useCombinedSource = createCombinedValueSource(
            () => ({
                id: 'posts',
                useOptions: () => buildState(firstOptions)
            }),
            () => ({
                id: 'pages',
                useOptions: () => buildState(secondOptions)
            })
        );

        const {result} = renderHook(() => {
            const source = useCombinedSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        expect(result.current.options).toEqual([
            {value: 'post-1', label: 'Post 1'},
            {value: 'post-2', label: 'Post 2'},
            {value: 'page-1', label: 'Page 1'},
            {value: 'page-2', label: 'Page 2'}
        ]);
    });

    it('loads more from the first source while it still has more pages', () => {
        const loadMoreFirst = vi.fn();
        const loadMoreSecond = vi.fn();
        const useCombinedSource = createCombinedValueSource(
            () => ({
                id: 'posts',
                useOptions: () => buildState(firstOptions, {
                    hasMore: true,
                    loadMore: loadMoreFirst
                })
            }),
            () => ({
                id: 'pages',
                useOptions: () => buildState(secondOptions, {
                    hasMore: true,
                    loadMore: loadMoreSecond
                })
            })
        );

        const {result} = renderHook(() => {
            const source = useCombinedSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        result.current.loadMore();

        expect(loadMoreFirst).toHaveBeenCalledTimes(1);
        expect(loadMoreSecond).not.toHaveBeenCalled();
    });

    it('loads more from the second source once the first source is exhausted', () => {
        const loadMoreFirst = vi.fn();
        const loadMoreSecond = vi.fn();
        const useCombinedSource = createCombinedValueSource(
            () => ({
                id: 'posts',
                useOptions: () => buildState(firstOptions, {
                    hasMore: false,
                    loadMore: loadMoreFirst
                })
            }),
            () => ({
                id: 'pages',
                useOptions: () => buildState(secondOptions, {
                    hasMore: true,
                    loadMore: loadMoreSecond
                })
            })
        );

        const {result} = renderHook(() => {
            const source = useCombinedSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        result.current.loadMore();

        expect(loadMoreFirst).not.toHaveBeenCalled();
        expect(loadMoreSecond).toHaveBeenCalledTimes(1);
    });
});
