import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser, usersDataType } from '@tryghost/admin-x-framework/api/current-user';
import { pagesDataType } from '@tryghost/admin-x-framework/api/pages';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useForceUpgrade } from '@/ember-bridge';
// pulls in FlexSearch, so import this hook only from a lazily loaded module
import { createSearchProvider } from './search-providers';
import {
  type SearchIndexItem,
  type SearchResultGroup,
  getSearchables,
  parseSearchIndexItems,
} from './searchables';

const SEARCH_DEBOUNCE_MS = 200;

type SearchIndexKey = 'posts' | 'pages' | 'tags' | 'users';

/**
 * Loads one `search-index/*` list. It's keyed under the resource's data type, so
 * the invalidation that follows a save (in React or Ember) marks it stale too.
 */
function useSearchIndex(key: SearchIndexKey, dataType: string, enabled: boolean) {
  const fetchApi = useFetchApi();
  const handleError = useHandleError();
  const url = apiUrl(`/search-index/${key}/`);

  const { data, isLoading, isFetching, isStale } = useQuery({
    queryKey: [dataType, url],
    // `{[key]: items}` matches the resource's response, which the framework's
    // cache helpers (eg. after a staff edit) update in place
    queryFn: async (): Promise<Partial<Record<SearchIndexKey, SearchIndexItem[]>>> => {
      try {
        const response = await fetchApi<Record<string, unknown>>(url);
        return { [key]: parseSearchIndexItems(response[key]) };
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    enabled,
    // up to 10k posts: refetched after invalidation, never on a timer
    staleTime: Infinity,
    gcTime: Infinity,
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

  const posts = useSearchIndex('posts', postsDataType, enabled);
  const pages = useSearchIndex('pages', pagesDataType, enabled);
  const tags = useSearchIndex('tags', 'TagsResponseType', enabled);
  const users = useSearchIndex('users', usersDataType, enabled);

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
