import {FilterOption, ValueSourceState} from '@tryghost/shade';
import {RemoteProbeState} from '@src/hooks/filter-sources/create-remote-value-source';
import {createHybridValueSource} from '@src/hooks/filter-sources/create-hybrid-value-source';
import {describe, expect, it} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useState} from 'react';

type TestItem = {
    id: string;
};

let probeState: RemoteProbeState<TestItem, string>;

const localOptions: FilterOption<string>[] = [
    {value: 'local', label: 'Local'}
];

const remoteOptions: FilterOption<string>[] = [
    {value: 'remote', label: 'Remote'}
];

function buildState(options: FilterOption<string>[]): ValueSourceState<string> {
    return {
        options,
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {}
    };
}

const useLocalSource = (_probe: RemoteProbeState<TestItem, string>, {enabled}: {enabled?: boolean}) => {
    return {
        id: 'local',
        useOptions: () => {
            return enabled ? buildState(localOptions) : buildState([]);
        }
    };
};

const useRemoteSource = ({enabled}: {enabled?: boolean} = {}) => {
    return {
        id: 'remote',
        useInitialBrowse: () => probeState,
        useOptions: () => {
            return enabled ? buildState(remoteOptions) : buildState([]);
        }
    };
};

const useHybridSource = createHybridValueSource<TestItem, string>({
    id: 'hybrid',
    pageLimit: 100,
    useLocalSource,
    useRemoteSource
});

describe('createHybridValueSource', () => {
    it('stays in loading state until pagination metadata is available and then resolves local mode', async () => {
        probeState = {
            items: undefined,
            options: [],
            isLoading: true,
            pagination: undefined
        };

        const {result, rerender} = renderHook(() => {
            const source = useHybridSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        expect(result.current.isInitialLoad).toBe(true);
        expect(result.current.options).toEqual([]);

        probeState = {
            items: [{id: '1'}],
            options: localOptions,
            isLoading: false,
            pagination: {
                total: 42,
                next: null
            }
        };

        rerender();

        await waitFor(() => {
            expect(result.current.options).toEqual(localOptions);
        });
    });

    it('resolves remote mode when the first page proves the dataset is larger than the local limit', async () => {
        probeState = {
            items: [{id: '1'}],
            options: remoteOptions,
            isLoading: false,
            pagination: {
                total: 250,
                next: 2
            }
        };

        const {result} = renderHook(() => {
            const source = useHybridSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        await waitFor(() => {
            expect(result.current.options).toEqual(remoteOptions);
        });
    });

    it('does not switch modes after the initial decision', async () => {
        probeState = {
            items: [{id: '1'}],
            options: localOptions,
            isLoading: false,
            pagination: {
                total: 60,
                next: null
            }
        };

        const {result, rerender} = renderHook(() => {
            const source = useHybridSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        await waitFor(() => {
            expect(result.current.options).toEqual(localOptions);
        });

        probeState = {
            items: [{id: '1'}],
            options: remoteOptions,
            isLoading: false,
            pagination: {
                total: 500,
                next: 2
            }
        };

        rerender();

        expect(result.current.options).toEqual(localOptions);
    });

    it('keeps child hook order stable while the hybrid mode is still resolving', async () => {
        const useHookedLocalSource = (_probe: RemoteProbeState<TestItem, string>, {enabled}: {enabled?: boolean}) => {
            return {
                id: 'hooked-local',
                useOptions: () => {
                    const [count, setCount] = useState(0);
                    const canUseOptions = count === 0 && typeof setCount === 'function' && enabled;

                    return canUseOptions ? buildState(localOptions) : buildState([]);
                }
            };
        };

        const useHookedRemoteSource = ({enabled}: {enabled?: boolean} = {}) => {
            return {
                id: 'hooked-remote',
                useInitialBrowse: () => probeState,
                useOptions: () => {
                    const [count, setCount] = useState(0);
                    const canUseOptions = count === 0 && typeof setCount === 'function' && enabled;

                    return canUseOptions ? buildState(remoteOptions) : buildState([]);
                }
            };
        };

        const useHookedHybridSource = createHybridValueSource<TestItem, string>({
            id: 'hooked-hybrid',
            pageLimit: 100,
            useLocalSource: useHookedLocalSource,
            useRemoteSource: useHookedRemoteSource
        });

        probeState = {
            items: undefined,
            options: [],
            isLoading: true,
            pagination: undefined
        };

        const {result, rerender} = renderHook(() => {
            const source = useHookedHybridSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        expect(result.current.isInitialLoad).toBe(true);

        probeState = {
            items: [{id: '1'}],
            options: localOptions,
            isLoading: false,
            pagination: {
                total: 42,
                next: null
            }
        };

        rerender();

        await waitFor(() => {
            expect(result.current.options).toEqual(localOptions);
        });
    });
});
