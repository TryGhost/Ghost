import { useCallback, useMemo, useRef } from 'react';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import type { Offer } from '@tryghost/admin-x-framework/api/offers';
import type { PostType } from './card-config';
import {
  type AutocompleteLink,
  type LatestPostSource,
  type LinkSearchGroup,
  type LinkSearchResultGroup,
  type SearchIndexEntity,
  type SearchIndexPost,
  buildAutocompleteLinks,
  buildLatestPostsGroup,
  buildOfferLinks,
  filterLinkSearchResults,
  searchIndexEntitiesGroup,
  searchIndexPostsGroup,
} from './link-suggestions';

export interface PostLinkSuggestionOptions {
  postType: PostType;
  homepageUrl: string;
  paidMembersEnabled: boolean;
  donationsEnabled: boolean;
  recommendationsEnabled: boolean;
  membersEnabled: boolean;
  timezone: string;
}

interface SearchIndex {
  posts: SearchIndexPost[];
  pages: SearchIndexPost[];
  tags: SearchIndexEntity[];
  users: SearchIndexEntity[];
}

interface SuggestionCache {
  offerLinks?: Promise<AutocompleteLink[]>;
  latestPosts?: Promise<LinkSearchGroup[]>;
  index: Partial<Record<keyof SearchIndex, Promise<unknown[]>>>;
}

// Link toolbar data is fetched on first use and cached for the editor's lifetime
export function usePostLinkSuggestions({
  postType,
  homepageUrl,
  paidMembersEnabled,
  donationsEnabled,
  recommendationsEnabled,
  membersEnabled,
  timezone,
}: PostLinkSuggestionOptions) {
  const fetchApi = useFetchApi();
  const cache = useRef<SuggestionCache>({ index: {} });

  const loadIndex = useCallback(
    <Key extends keyof SearchIndex>(key: Key): Promise<SearchIndex[Key]> => {
      const cached = cache.current.index[key];
      if (cached) {
        return cached as Promise<SearchIndex[Key]>;
      }

      const request: Promise<SearchIndex[Key]> = fetchApi<Record<Key, SearchIndex[Key]>>(
        apiUrl(`/search-index/${key}/`),
      )
        .then((response) => response[key])
        .catch(() => {
          delete cache.current.index[key];
          return [] as SearchIndex[Key];
        });
      cache.current.index[key] = request;
      return request;
    },
    [fetchApi],
  );

  const fetchAutocompleteLinks = useCallback(async () => {
    // Only active signup offers belong in link dropdowns: archived offers are
    // gone and retention offers only surface in cancellation flows
    cache.current.offerLinks ??= fetchApi<{ offers?: Offer[] }>(
      apiUrl('/offers/', { filter: 'status:active+redemption_type:signup' }),
    )
      .then((response) => buildOfferLinks(response.offers ?? [], homepageUrl))
      .catch(() => {
        delete cache.current.offerLinks;
        return [];
      });

    const offerLinks = await cache.current.offerLinks;

    return buildAutocompleteLinks(
      { postType, homepageUrl, paidMembersEnabled, donationsEnabled, recommendationsEnabled },
      offerLinks,
    );
  }, [
    fetchApi,
    postType,
    homepageUrl,
    paidMembersEnabled,
    donationsEnabled,
    recommendationsEnabled,
  ]);

  const decorationSettings = useMemo(
    () => ({ timezone, membersEnabled }),
    [timezone, membersEnabled],
  );

  const searchLinks = useCallback(
    async (term?: string): Promise<LinkSearchGroup[]> => {
      if (!term) {
        cache.current.latestPosts ??= fetchApi<{ posts: LatestPostSource[] }>(
          apiUrl('/posts/', {
            filter: 'status:published',
            fields: 'id,url,title,visibility,published_at',
            order: 'published_at desc',
            limit: '5',
          }),
        )
          .then((response) => buildLatestPostsGroup(response.posts, decorationSettings))
          .catch((error: unknown) => {
            delete cache.current.latestPosts;
            throw error;
          });

        return cache.current.latestPosts;
      }

      const [users, tags, posts, pages] = await Promise.all([
        loadIndex('users'),
        loadIndex('tags'),
        loadIndex('posts'),
        loadIndex('pages'),
      ]);

      const groups: LinkSearchResultGroup[] = [
        searchIndexEntitiesGroup('Staff', users, term),
        searchIndexEntitiesGroup('Tags', tags, term),
        searchIndexPostsGroup('Posts', posts, term),
        searchIndexPostsGroup('Pages', pages, term),
      ];

      return filterLinkSearchResults(groups, decorationSettings);
    },
    [fetchApi, loadIndex, decorationSettings],
  );

  return { fetchAutocompleteLinks, searchLinks };
}
