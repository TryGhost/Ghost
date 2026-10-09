import { useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import type { Offer } from '@tryghost/admin-x-framework/api/offers';
import type { PostType } from './card-config';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import {
  type SearchIndexItem,
  type SearchIndexKey,
  searchIndexQueryOptions,
} from '@/shared/search-index';
import {
  type AutocompleteLink,
  buildAutocompleteLinks,
  buildOfferLinks,
} from '@/shared/autocomplete-links';
import {
  type LatestPostSource,
  type LinkSearchGroup,
  type LinkSearchResultGroup,
  type SearchIndexEntity,
  type SearchIndexPost,
  buildLatestPostsGroup,
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
  membersSignupAccess?: string;
  membersEnabled: boolean;
  timezone: string;
}

interface SuggestionCache {
  offerLinks?: Promise<AutocompleteLink[]>;
  latestPosts?: Promise<LinkSearchGroup[]>;
}

const isEntity = (item: SearchIndexItem): item is SearchIndexItem & SearchIndexEntity =>
  typeof item.name === 'string';
const isPost = (item: SearchIndexItem): item is SearchIndexItem & SearchIndexPost =>
  typeof item.title === 'string';

// Link toolbar data is fetched on first use; content lists follow resource mutations.
export function usePostLinkSuggestions({
  postType,
  homepageUrl,
  paidMembersEnabled,
  donationsEnabled,
  recommendationsEnabled,
  membersSignupAccess,
  membersEnabled,
  timezone,
}: PostLinkSuggestionOptions) {
  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();
  const cache = useRef<SuggestionCache>({});

  const loadIndex = useCallback(
    async (key: SearchIndexKey): Promise<SearchIndexItem[]> => {
      try {
        const response = await queryClient.fetchQuery(
          searchIndexQueryOptions(key, fetchApi, EDITOR_REQUEST_OPTIONS),
        );
        return response[key] ?? [];
      } catch {
        return [];
      }
    },
    [fetchApi, queryClient],
  );

  const fetchAutocompleteLinks = useCallback(async () => {
    // Only active signup offers belong in link dropdowns: archived offers are
    // gone and retention offers only surface in cancellation flows
    cache.current.offerLinks ??= fetchApi<{ offers?: Offer[] }>(
      apiUrl('/offers/', { filter: 'status:active+redemption_type:signup' }),
      EDITOR_REQUEST_OPTIONS,
    )
      .then((response) => buildOfferLinks(response.offers ?? [], homepageUrl))
      .catch(() => {
        delete cache.current.offerLinks;
        return [];
      });

    const offerLinks = await cache.current.offerLinks;

    return buildAutocompleteLinks(
      {
        postType,
        homepageUrl,
        paidMembersEnabled,
        donationsEnabled,
        recommendationsEnabled,
        membersSignupAccess,
      },
      offerLinks,
    );
  }, [
    fetchApi,
    postType,
    homepageUrl,
    paidMembersEnabled,
    donationsEnabled,
    recommendationsEnabled,
    membersSignupAccess,
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
          EDITOR_REQUEST_OPTIONS,
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
        searchIndexEntitiesGroup('Staff', users.filter(isEntity), term),
        searchIndexEntitiesGroup('Tags', tags.filter(isEntity), term),
        searchIndexPostsGroup('Posts', posts.filter(isPost), term),
        searchIndexPostsGroup('Pages', pages.filter(isPost), term),
      ];

      return filterLinkSearchResults(groups, decorationSettings);
    },
    [fetchApi, loadIndex, decorationSettings],
  );

  return { fetchAutocompleteLinks, searchLinks };
}
