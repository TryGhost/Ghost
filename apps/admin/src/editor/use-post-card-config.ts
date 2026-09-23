import { useCallback, useMemo, useRef } from 'react';
import { useFramework } from '@tryghost/admin-x-framework';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import {
  useFeatureFlag,
  useFetchApi,
  useKoenigFetchEmbed,
  usePinturaConfig,
} from '@tryghost/admin-x-framework/hooks';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import { getHomepageUrl, useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import {
  type CardConfigPostSource,
  type CardConfigSnippet,
  type CardConfigSnippetInput,
  type PostCardConfig,
  buildCardConfigPost,
  buildPostCardConfig,
} from './card-config';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useEditorSettings, useSiteTimezone } from './use-editor-settings';
import { usePostLinkSuggestions } from './use-post-link-suggestions';
import { useIsAppActivated, usePodcastsWithEpisodes } from '@/apps/api';

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
  const { data: settingsData } = useEditorSettings();
  const timezone = useSiteTimezone();
  const { data: configData } = useBrowseConfig({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { data: siteData } = useBrowseSite({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { data: currentUser } = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { unsplashConfig } = useFramework();
  const pinturaConfig = usePinturaConfig({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const fetchEmbed = useKoenigFetchEmbed(EDITOR_REQUEST_OPTIONS);
  const fetchApi = useFetchApi();
  const appsEnabled = useFeatureFlag('apps');
  const podcastsActivated = useIsAppActivated('podcasts');
  const podcastsWithEpisodes = usePodcastsWithEpisodes();
  const podcasts = useMemo(
    () =>
      podcastsWithEpisodes.map((podcast) => ({
        id: podcast.id,
        title: podcast.title,
        artworkUrl: podcast.artworkUrl,
        episodes: podcast.episodes.map((episode) => ({
          id: episode.id,
          title: episode.title,
          description: episode.description,
          audioUrl: episode.audioUrl,
          duration: episode.duration,
          artworkUrl: episode.artworkUrl,
          status: episode.status,
        })),
      })),
    [podcastsWithEpisodes],
  );
  const activatedApps = useMemo(() => (podcastsActivated ? ['podcasts'] : []), [podcastsActivated]);

  const settings = settingsData?.settings ?? null;
  const config = configData?.config;
  const site = siteData?.site;

  const labelsRequest = useRef<Promise<string[]> | null>(null);
  const fetchLabels = useCallback(() => {
    labelsRequest.current ??= fetchApi<{ labels: { name: string }[] }>(
      apiUrl('/labels/', { limit: 'all', fields: 'id,name' }),
      EDITOR_REQUEST_OPTIONS,
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
    timezone,
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
        appsEnabled,
        activatedApps,
        podcasts,
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
    appsEnabled,
    activatedApps,
    podcasts,
    fetchEmbed,
    fetchAutocompleteLinks,
    searchLinks,
    fetchLabels,
    createSnippet,
    deleteSnippet,
  ]);
}
