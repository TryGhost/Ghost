import { useCallback, useMemo, useRef } from 'react';
import { useFramework } from '@tryghost/admin-x-framework';
import {
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
import { type LabelsPage, fetchAllLabelNames } from './card-labels';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useEditorSettings, useSiteTimezone } from './use-editor-settings';
import { usePostLinkSuggestions } from './use-post-link-suggestions';

export interface PostCardConfigOptions {
  post: CardConfigPostSource;
  snippets: CardConfigSnippet[];
  createSnippet?: (snippet: CardConfigSnippetInput) => void;
  deleteSnippet?: (snippet: { name: string }) => void;
}

export interface PostCardConfigState {
  /** Null until the boot data it reads has resolved. */
  cardConfig: PostCardConfig | null;
  /** A boot read failed with no copy cached, so the config waits until it is read again. */
  failed: boolean;
  /** Reads the failed boot data again. */
  retry: () => void;
}

/**
 * Assembles the post editor's Koenig `cardConfig` from the framework's data
 * hooks, and says when the boot data it reads could not be loaded.
 */
export function usePostCardConfig({
  post,
  snippets,
  createSnippet,
  deleteSnippet,
}: PostCardConfigOptions): PostCardConfigState {
  const settingsRead = useEditorSettings();
  const timezone = useSiteTimezone();
  const configRead = useBrowseConfig({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const siteRead = useBrowseSite({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const currentUserRead = useCurrentUser({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { unsplashConfig } = useFramework();
  const pinturaConfig = usePinturaConfig({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const fetchEmbed = useKoenigFetchEmbed(EDITOR_REQUEST_OPTIONS);
  const fetchApi = useFetchApi();

  const settings = settingsRead.data?.settings ?? null;
  const config = configRead.data?.config;
  const site = siteRead.data?.site;
  const currentUser = currentUserRead.data;

  const labelsRequest = useRef<Promise<string[]> | null>(null);
  const fetchLabels = useCallback(() => {
    labelsRequest.current ??= fetchAllLabelNames((url) =>
      fetchApi<LabelsPage>(url, EDITOR_REQUEST_OPTIONS),
    ).catch((error: unknown) => {
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

  const cardConfig = useMemo(() => {
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

  // Nothing reads a failed query again on its own, so without a copy the config never builds.
  const failedReads = [settingsRead, configRead, siteRead, currentUserRead].filter(
    (read) => read.data === undefined && read.isError && !read.isFetching,
  );

  return {
    cardConfig,
    failed: failedReads.length > 0,
    retry: () => {
      for (const read of failedReads) {
        void read.refetch();
      }
    },
  };
}
