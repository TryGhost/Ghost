import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useFetchApi, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useForceUpgrade } from '@/billing/api';
// pulls in FlexSearch, so import this hook only from a lazily loaded module
import { createSearchProvider } from './search-providers';
import { type SearchIndexKey, searchIndexQueryOptions } from '@/shared/search-index';
import { type SearchResultGroup, getSearchables } from './searchables';

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Loads one `search-index/*` list. It's keyed under the resource's data type, so
 * the invalidation that follows most saves (in React or Ember) marks it stale
 * too; a React post or page edit writes the saved entry into it instead.
 */
function useSearchIndex(key: SearchIndexKey, enabled: boolean) {
  const fetchApi = useFetchApi();
  const handleError = useHandleError();
  const options = searchIndexQueryOptions(key, fetchApi);

  const { data, isLoading, isFetching, isStale } = useQuery({
    ...options,
    queryFn: async () => {
      try {
        return await options.queryFn();
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    enabled,
  });

  // a refetch after invalidation would otherwise serve removed or renamed content
  return { items: data?.[key], isLoading: isLoading || (isFetching && isStale) };
}

/**
 * Searches staff, tags, posts, pages and any configured billing entries for the
 * Cmd-K modal. The index loads on the first non-blank term.
 */
export function useGlobalSearch(term: string): {
  results: SearchResultGroup[];
  isLoading: boolean;
} {
  const [debouncedTerm] = useDebounce(term, SEARCH_DEBOUNCE_MS);
  const enabled = term.trim() !== '';

  const posts = useSearchIndex('posts', enabled);
  const pages = useSearchIndex('pages', enabled);
  const tags = useSearchIndex('tags', enabled);
  const users = useSearchIndex('users', enabled);

  const { data: config, isLoading: isConfigLoading } = useBrowseConfig();
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: settings, isLoading: isSettingsLoading } = useBrowseSettings();
  const forceUpgrade = useForceUpgrade();

  const hostSettings = config?.config.hostSettings;
  const canAccessBilling =
    Boolean(forceUpgrade) ||
    (Boolean(hostSettings?.billing?.enabled) && Boolean(currentUser && isOwnerUser(currentUser)));
  const locale = getSettingValue<string>(settings?.settings, 'locale');

  // billing access and the locale decide which results exist, so wait for them too
  const isContentLoading =
    posts.isLoading ||
    pages.isLoading ||
    tags.isLoading ||
    users.isLoading ||
    isConfigLoading ||
    isUserLoading ||
    isSettingsLoading;

  const searchables = useMemo(
    () => getSearchables(canAccessBilling ? hostSettings : undefined),
    [canAccessBilling, hostSettings],
  );

  const provider = useMemo(
    () =>
      isContentLoading
        ? null
        : createSearchProvider(searchables, locale, {
            post: posts.items,
            page: pages.items,
            tag: tags.items,
            user: users.items,
          }),
    [isContentLoading, searchables, locale, posts.items, pages.items, tags.items, users.items],
  );

  const results = useMemo(
    () => (enabled && provider ? provider.search(debouncedTerm) : []),
    [enabled, provider, debouncedTerm],
  );

  return {
    results,
    isLoading: enabled && (isContentLoading || term !== debouncedTerm),
  };
}
