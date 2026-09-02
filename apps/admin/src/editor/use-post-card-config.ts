import { useCallback, useMemo, useRef } from 'react';
import { useFramework } from '@tryghost/admin-x-framework';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import {
  useFetchApi,
  useKoenigFetchEmbed,
  usePinturaConfig,
} from '@tryghost/admin-x-framework/hooks';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getHomepageUrl, useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import {
  type CardConfigPostSource,
  type CardConfigSnippet,
  type CardConfigSnippetInput,
  type PostCardConfig,
  buildCardConfigPost,
  buildPostCardConfig,
} from './card-config';
import { usePostLinkSuggestions } from './use-post-link-suggestions';

export interface PostCardConfigOptions {
  post: CardConfigPostSource;
  snippets: CardConfigSnippet[];
  createSnippet?: (snippet: CardConfigSnippetInput) => void;
  deleteSnippet?: (snippet: { name: string }) => void;
}

/**
 * Assembles the post editor's Koenig `cardConfig` from the framework's data
 * hooks. Returns null until the boot data it reads has resolved.
 */
export function usePostCardConfig({
  post,
  snippets,
  createSnippet,
  deleteSnippet,
}: PostCardConfigOptions): PostCardConfig | null {
  const { data: settingsData } = useBrowseSettings();
  const { data: configData } = useBrowseConfig();
  const { data: siteData } = useBrowseSite();
  const { data: currentUser } = useCurrentUser();
  const { unsplashConfig } = useFramework();
  const pinturaConfig = usePinturaConfig();
  const fetchEmbed = useKoenigFetchEmbed();
  const fetchApi = useFetchApi();

  const settings = settingsData?.settings ?? null;
  const config = configData?.config;
  const site = siteData?.site;

  const labelsRequest = useRef<Promise<string[]> | null>(null);
  const fetchLabels = useCallback(() => {
    labelsRequest.current ??= fetchApi<{ labels: { name: string }[] }>(
      apiUrl('/labels/', { limit: 'all', fields: 'id,name' }),
    )
      .then((response) => response.labels.map((label) => label.name))
      .catch((error: unknown) => {
        labelsRequest.current = null;
        throw error;
      });

    return labelsRequest.current;
  }, [fetchApi]);

  const { fetchAutocompleteLinks, searchLinks } = usePostLinkSuggestions({
    postType: post.displayName,
    homepageUrl: site ? getHomepageUrl(site) : '/',
    paidMembersEnabled: getSettingValue<boolean>(settings, 'paid_members_enabled') === true,
    donationsEnabled: getSettingValue<boolean>(settings, 'donations_enabled') === true,
    recommendationsEnabled: getSettingValue<boolean>(settings, 'recommendations_enabled') === true,
    membersEnabled: getSettingValue<string>(settings, 'members_signup_access') !== 'none',
    timezone: getSettingValue<string>(settings, 'timezone') ?? 'Etc/UTC',
  });

  const defaultContentVisibility =
    getSettingValue<string>(settings, 'default_content_visibility') ?? 'public';
  const cardConfigPost = useMemo(
    () => buildCardConfigPost(post, defaultContentVisibility),
    [post, defaultContentVisibility],
  );

  return useMemo(() => {
    if (!settings || !config || !site || !currentUser) {
      return null;
    }

    return buildPostCardConfig(
      {
        settings,
        config,
        site,
        currentUser,
        unsplashHeaders: unsplashConfig,
        pinturaConfig,
        post: cardConfigPost,
        snippets,
      },
      {
        fetchEmbed,
        fetchAutocompleteLinks,
        searchLinks,
        fetchLabels,
        createSnippet,
        deleteSnippet,
      },
    );
  }, [
    settings,
    config,
    site,
    currentUser,
    unsplashConfig,
    pinturaConfig,
    cardConfigPost,
    snippets,
    fetchEmbed,
    fetchAutocompleteLinks,
    searchLinks,
    fetchLabels,
    createSnippet,
    deleteSnippet,
  ]);
}
