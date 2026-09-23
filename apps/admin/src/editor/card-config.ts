import { type Config } from '@tryghost/admin-x-framework/api/config';
import {
  type Setting,
  checkStripeEnabled,
  getSettingValue,
} from '@tryghost/admin-x-framework/api/settings';
import { type SiteData, getHomepageUrl } from '@tryghost/admin-x-framework/api/site';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import type { AutocompleteLink, LinkSearchGroup } from './link-suggestions';

export type PostType = 'post' | 'page';

export interface CardConfigPost {
  displayName: PostType;
  isPage: boolean;
  showTitleAndFeatureImage: boolean;
  visibility: string;
}

export interface CardConfigPostSource {
  displayName: PostType;
  showTitleAndFeatureImage?: boolean;
  visibility?: string | null;
}

export interface CardConfigSnippet {
  id: string;
  name: string;
  value: string;
}

export interface CardConfigSnippetInput {
  name: string;
  value: string;
}

/** An episode the podcast card can pick, as the Podcasts app describes it. */
export interface CardConfigPodcastEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: string;
  artworkUrl: string;
  status: string;
}

export interface CardConfigPodcast {
  id: string;
  title: string;
  artworkUrl: string;
  episodes: CardConfigPodcastEpisode[];
}

export interface PostCardConfigSources {
  settings: Setting[];
  config: Config;
  site: SiteData;
  currentUser: Parameters<typeof isContributorUser>[0];
  unsplashHeaders: Record<string, string | boolean>;
  pinturaConfig: { jsUrl: string; cssUrl: string } | null;
  post: CardConfigPost | undefined;
  snippets: CardConfigSnippet[];
  /** The `apps` Labs flag as Admin resolves it, including session overrides. */
  appsEnabled: boolean;
  /** Ids of apps activated under Apps; gates app-provided cards. */
  activatedApps: string[];
  /** The Podcasts app's podcasts and episodes, offered by the podcast card. */
  podcasts: CardConfigPodcast[];
}

export interface PostCardConfigPorts {
  fetchEmbed: (url: string, options: { type?: string }) => Promise<unknown>;
  fetchAutocompleteLinks: () => Promise<AutocompleteLink[]>;
  searchLinks: (term?: string) => Promise<LinkSearchGroup[] | undefined>;
  fetchLabels: () => Promise<string[]>;
  createSnippet?: (snippet: CardConfigSnippetInput) => void;
  deleteSnippet?: (snippet: { name: string }) => void;
}

export type CardVisibilitySettings = 'web only' | 'web and email';

export interface PostCardConfig extends PostCardConfigPorts {
  unsplash: Record<string, string | boolean> | null;
  klipy: NonNullable<Config['klipy']> | null;
  pinturaConfig: { jsUrl: string; cssUrl: string } | null;
  renderLabels: boolean;
  feature: { transistor: boolean; paywallImprovements: boolean; podcasts: boolean };
  podcasts: CardConfigPodcast[];
  deprecated: { headerV1: boolean };
  membersEnabled: boolean;
  siteTitle: string;
  siteDescription: string;
  siteOgImage: string | null;
  siteTwitterImage: string | null;
  siteCoverImage: string | null;
  siteUrl: string;
  siteUuid: string;
  stripeEnabled: boolean;
  post: CardConfigPost | undefined;
  snippets: CardConfigSnippet[];
  visibilitySettings: CardVisibilitySettings;
}

// An unsaved post has no visibility until the first save applies the site
// default, so it is resolved here to keep `visibility` present for cards.
export function buildCardConfigPost(
  post: CardConfigPostSource | undefined,
  defaultContentVisibility: string,
): CardConfigPost | undefined {
  if (!post) {
    return undefined;
  }

  return {
    displayName: post.displayName,
    isPage: post.displayName === 'page',
    showTitleAndFeatureImage: post.showTitleAndFeatureImage ?? true,
    visibility: post.visibility || defaultContentVisibility,
  };
}

export function getCardVisibilitySettings(
  post: Pick<CardConfigPost, 'isPage' | 'displayName'> | undefined,
): CardVisibilitySettings {
  const isPage = post?.isPage || post?.displayName === 'page';
  return isPage ? 'web only' : 'web and email';
}

function imageSetting(settings: Setting[], key: string): string | null {
  const value = getSettingValue(settings, key);
  return typeof value === 'string' ? value : null;
}

export function buildPostCardConfig(
  sources: PostCardConfigSources,
  ports: PostCardConfigPorts,
): PostCardConfig {
  const { settings, config, site, currentUser } = sources;
  const podcastsEnabled = sources.appsEnabled && sources.activatedApps.includes('podcasts');

  return {
    unsplash: getSettingValue<boolean>(settings, 'unsplash') ? sources.unsplashHeaders : null,
    klipy: config.klipy?.apiKey ? config.klipy : null,
    pinturaConfig: sources.pinturaConfig,
    fetchAutocompleteLinks: ports.fetchAutocompleteLinks,
    fetchEmbed: ports.fetchEmbed,
    fetchLabels: ports.fetchLabels,
    renderLabels: !isContributorUser(currentUser),
    feature: {
      transistor: getSettingValue<boolean>(settings, 'transistor') === true,
      paywallImprovements: config.labs?.paywallImprovements === true,
      // The Podcasts app card needs both the `apps` Labs flag and the app to
      // have been activated under Apps.
      podcasts: podcastsEnabled,
    },
    podcasts: podcastsEnabled ? sources.podcasts : [],
    deprecated: {
      headerV1: true,
    },
    membersEnabled: getSettingValue<string>(settings, 'members_signup_access') === 'all',
    searchLinks: ports.searchLinks,
    siteTitle: getSettingValue<string>(settings, 'title') ?? '',
    siteDescription: getSettingValue<string>(settings, 'description') ?? '',
    siteOgImage: imageSetting(settings, 'og_image'),
    siteTwitterImage: imageSetting(settings, 'twitter_image'),
    siteCoverImage: imageSetting(settings, 'cover_image'),
    siteUrl: getHomepageUrl(site),
    siteUuid: site.site_uuid,
    stripeEnabled: checkStripeEnabled(settings, config),
    post: sources.post,
    snippets: sources.snippets,
    createSnippet: ports.createSnippet,
    deleteSnippet: ports.deleteSnippet,
    visibilitySettings: getCardVisibilitySettings(sources.post),
  };
}

export interface LiveCardConfigSettings {
  visibility?: string | null;
  showTitleAndFeatureImage?: boolean | null;
}

// The live settings fields, not the saved record: a visibility or a hidden
// title the writer has only staged still decides what the cards describe.
export function withLiveSettings(
  cardConfig: PostCardConfig,
  live: LiveCardConfigSettings,
): PostCardConfig {
  if (!cardConfig.post) {
    return cardConfig;
  }

  return {
    ...cardConfig,
    post: {
      ...cardConfig.post,
      visibility: live.visibility || cardConfig.post.visibility,
      showTitleAndFeatureImage: live.showTitleAndFeatureImage ?? true,
    },
  };
}
