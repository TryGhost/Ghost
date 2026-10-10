import { useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
// pulls in FlexSearch, so import this hook only from a lazily loaded module
import { createSearchProvider } from './search-providers';
import type { SearchResultGroup } from './search-source';
import { useSearchSources } from './use-search-sources';

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Searches every source for the Cmd-K modal. Content indexes load on the first
 * non-blank term.
 */
export function useGlobalSearch(term: string): {
  results: SearchResultGroup[];
  isLoading: boolean;
} {
  const [debouncedTerm] = useDebounce(term, SEARCH_DEBOUNCE_MS);
  const enabled = term.trim() !== '';

  const sources = useSearchSources({ term: debouncedTerm, enabled });
  const { data: settings, isLoading: isSettingsLoading } = useBrowseSettings();
  const locale = getSettingValue<string>(settings?.settings, 'locale');

  // the locale picks the matcher, so wait for it too
  const isSourceLoading = isSettingsLoading || sources.some((source) => source.isLoading);

  const provider = useMemo(
    () => (isSourceLoading ? null : createSearchProvider(sources, locale)),
    [isSourceLoading, sources, locale],
  );

  const results = useMemo(
    () => (enabled && provider ? provider.search(debouncedTerm) : []),
    [enabled, provider, debouncedTerm],
  );

  return {
    results,
    isLoading: enabled && (isSourceLoading || term !== debouncedTerm),
  };
}
