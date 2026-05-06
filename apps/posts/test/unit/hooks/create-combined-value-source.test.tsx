import {createCombinedValueSource} from '@src/hooks/filter-sources/create-combined-value-source';
import {createRemoteValueSource} from '@src/hooks/filter-sources/create-remote-value-source';
import {describe, expect, it} from 'vitest';
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

const useCombinedSource = createCombinedValueSource(
    useFirstSource,
    useSecondSource,
    value => ({
        value,
        label: `ID: ${value}`
    })
);

describe('createCombinedValueSource', () => {
    it('prefers a hydrated option from one source over a fallback from another source', () => {
        firstBrowseData = [];
        firstHydrateData = [];
        secondBrowseData = [];
        secondHydrateData = [{id: 'page-id', label: 'About page'}];

        const {result} = renderHook(() => {
            const source = useCombinedSource();

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
            const source = useCombinedSource();

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
});
