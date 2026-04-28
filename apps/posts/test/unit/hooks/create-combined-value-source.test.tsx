import {FilterOption, ValueSourceState} from '@tryghost/shade/patterns';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createCombinedValueSource} from '@src/hooks/filter-sources/create-combined-value-source';
import {createRemoteValueSource} from '@src/hooks/filter-sources/create-remote-value-source';
import {renderHook} from '@testing-library/react';

type TestItem = {
    id: string;
    label: string;
};

let firstBrowseData: TestItem[] | undefined;
let firstHydrateData: TestItem[] | undefined;
let secondBrowseData: TestItem[] | undefined;
let secondHydrateData: TestItem[] | undefined;

const useFirstSource = createRemoteValueSource<TestItem>({
    id: 'first.remote',
    useBrowse: () => ({
        data: firstBrowseData,
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {}
    }),
    useHydrate: () => ({
        data: firstHydrateData,
        isLoading: false
    }),
    toOption: item => ({
        value: item.id,
        label: item.label
    })
});

const useSecondSource = createRemoteValueSource<TestItem>({
    id: 'second.remote',
    useBrowse: () => ({
        data: secondBrowseData,
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {}
    }),
    useHydrate: () => ({
        data: secondHydrateData,
        isLoading: false
    }),
    toOption: item => ({
        value: item.id,
        label: item.label
    })
});

const useRemoteCombinedSource = createCombinedValueSource(
    useFirstSource,
    useSecondSource,
    value => ({
        value,
        label: `ID: ${value}`
    })
);

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
    beforeEach(() => {
        firstBrowseData = undefined;
        firstHydrateData = undefined;
        secondBrowseData = undefined;
        secondHydrateData = undefined;
    });

    it('prefers a hydrated option from one source over a fallback from another source', () => {
        firstBrowseData = [];
        firstHydrateData = [];
        secondBrowseData = [];
        secondHydrateData = [{id: 'page-id', label: 'About page'}];

        const {result} = renderHook(() => {
            const source = useRemoteCombinedSource();

            return source.useOptions({
                query: '',
                selectedValues: ['page-id']
            });
        });

        expect(result.current.options).toEqual([
            {
                value: 'page-id',
                label: 'About page'
            }
        ]);
    });

    it('adds a fallback option when neither source can hydrate a selected value', () => {
        firstBrowseData = [];
        firstHydrateData = [];
        secondBrowseData = [];
        secondHydrateData = [];

        const {result} = renderHook(() => {
            const source = useRemoteCombinedSource();

            return source.useOptions({
                query: '',
                selectedValues: ['missing-id']
            });
        });

        expect(result.current.options).toEqual([
            {
                value: 'missing-id',
                label: 'ID: missing-id'
            }
        ]);
    });

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

    it('hides second source options while the first source still has more pages', () => {
        const useCombinedSource = createCombinedValueSource(
            () => ({
                id: 'posts',
                useOptions: () => buildState(firstOptions, {hasMore: true})
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
            {value: 'post-2', label: 'Post 2'}
        ]);
        expect(result.current.hasMore).toBe(true);
    });

    it('reveals second source options once the first source is exhausted', () => {
        const useCombinedSource = createCombinedValueSource(
            () => ({
                id: 'posts',
                useOptions: () => buildState(firstOptions, {hasMore: false})
            }),
            () => ({
                id: 'pages',
                useOptions: () => buildState(secondOptions, {hasMore: true})
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
