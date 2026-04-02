import {RemoteProbeState, RemoteValueSourceHook, ValueSourceHookOptions} from './create-remote-value-source';
import {ValueSource, ValueSourceParams, ValueSourceState} from '@tryghost/shade/patterns';
import {useEffect, useState} from 'react';

interface HybridValueSourceConfig<Item, T = string> {
    id: string;
    pageLimit: number;
    useLocalSource: (probe: RemoteProbeState<Item, T>, options: ValueSourceHookOptions) => ValueSource<T>;
    useRemoteSource: RemoteValueSourceHook<T, Item>;
}

const NOOP = () => {};

export function createHybridValueSource<Item, T = string>(
    config: HybridValueSourceConfig<Item, T>
): () => ValueSource<T> {
    return function useHybridValueSource(): ValueSource<T> {
        const probeSource = config.useRemoteSource({enabled: true});
        const probe = probeSource.useInitialBrowse();
        const [mode, setMode] = useState<'local' | 'remote' | null>(null);

        useEffect(() => {
            if (mode !== null || !probe.pagination) {
                return;
            }

            setMode(probe.pagination.total <= config.pageLimit || probe.pagination.next === null ? 'local' : 'remote');
        }, [mode, probe.pagination]);

        const localSource = config.useLocalSource(probe, {enabled: mode === 'local'});
        const remoteSource = config.useRemoteSource({enabled: mode === 'remote'});

        const useOptions = (params: ValueSourceParams<T>): ValueSourceState<T> => {
            const localState = localSource.useOptions(params);
            const remoteState = remoteSource.useOptions(params);

            if (mode === null) {
                return {
                    options: [],
                    isInitialLoad: probe.isLoading,
                    isSearching: false,
                    isLoadingMore: false,
                    hasMore: false,
                    loadMore: NOOP
                };
            }

            return mode === 'remote' ? remoteState : localState;
        };

        return {
            id: config.id,
            useOptions
        };
    };
}
