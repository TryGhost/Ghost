import {createRemoteValueSource} from '@src/hooks/filter-sources/create-remote-value-source';
import {describe, expect, it} from 'vitest';
import {renderHook} from '@testing-library/react';

type TestItem = {
    id: string;
    label: string;
};

let browseData: TestItem[] | undefined;
let hydrateData: TestItem[] | undefined;

const useTestSource = createRemoteValueSource<TestItem>({
    id: 'test.remote',
    useBrowse: () => ({
        data: browseData,
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {}
    }),
    useHydrate: () => ({
        data: hydrateData,
        isLoading: false
    }),
    toOption: item => ({
        value: item.id,
        label: item.label
    }),
    getMissingSelectedOption: value => ({
        value,
        label: `ID: ${value}`
    })
});

describe('createRemoteValueSource', () => {
    it('keeps a fallback option for selected values that cannot be hydrated', () => {
        browseData = [];
        hydrateData = [];

        const {result} = renderHook(() => {
            const source = useTestSource();

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
