import {
  type RemoteProbeState,
  type RemoteValueSourceHook,
  type ValueSourceHookOptions,
  type ValueSourceQueryOptions,
} from './create-remote-value-source';
import {
  type ValueSource,
  type ValueSourceParams,
  type ValueSourceState,
} from '@tryghost/shade/patterns';
import { useEffect, useState } from 'react';

export type HybridValueSourceOptions = {
  queryOptions?: ValueSourceQueryOptions;
};

/**
 * What the first page said about the whole collection, for callers that need to
 * know whether there is anything to pick before anyone has typed a search.
 */
export type HybridProbeState = {
  isLoading: boolean;
  /** The collection's size per the first page's pagination; undefined until it arrives. */
  total: number | undefined;
};

export type HybridValueSource<T = string> = ValueSource<T> & {
  probe: HybridProbeState;
};

interface HybridValueSourceConfig<Item, T = string> {
  id: string;
  pageLimit: number;
  useLocalSource: (
    probe: RemoteProbeState<Item, T>,
    options: ValueSourceHookOptions,
  ) => ValueSource<T>;
  useRemoteSource: RemoteValueSourceHook<T, Item>;
}

const NOOP = () => {};

export function createHybridValueSource<Item, T = string>(
  config: HybridValueSourceConfig<Item, T>,
): (options?: HybridValueSourceOptions) => HybridValueSource<T> {
  return function useHybridValueSource(options = {}): HybridValueSource<T> {
    const { queryOptions } = options;
    const probeSource = config.useRemoteSource({ enabled: true, queryOptions });
    const probe = probeSource.useInitialBrowse();
    const [mode, setMode] = useState<'local' | 'remote' | null>(null);

    useEffect(() => {
      if (mode !== null) {
        return;
      }

      // A browse that answered without pagination has nothing more to page.
      if (!probe.pagination) {
        if (!probe.isLoading && probe.items !== undefined) {
          setMode('local');
        }
        return;
      }

      setMode(
        probe.pagination.total <= config.pageLimit || probe.pagination.next === null
          ? 'local'
          : 'remote',
      );
    }, [mode, probe.isLoading, probe.items, probe.pagination]);

    const localSource = config.useLocalSource(probe, { enabled: mode === 'local', queryOptions });
    const remoteSource = config.useRemoteSource({ enabled: mode === 'remote', queryOptions });

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
          loadMore: NOOP,
        };
      }

      return mode === 'remote' ? remoteState : localState;
    };

    return {
      id: config.id,
      useOptions,
      probe: {
        isLoading: probe.isLoading,
        total: probe.pagination?.total ?? probe.items?.length,
      },
    };
  };
}
