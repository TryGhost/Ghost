import { type Config } from '@tryghost/admin-x-framework/api/config';
import {
  type Setting,
  checkStripeEnabled,
  getSettingValue,
} from '@tryghost/admin-x-framework/api/settings';
import { type SiteData, getHomepageUrl } from '@tryghost/admin-x-framework/api/site';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import type { AutocompleteLink, LinkSearchGroup } from './link-suggestions';

// Pure builder for the post editor's Koenig `cardConfig`; every asynchronous
// piece (embeds, link search, labels, snippets) arrives as a port.

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

export interface PostCardConfigSources {
  settings: Setting[];
  config: Config;
  site: SiteData;
  currentUser: Parameters<typeof isContributorUser>[0];
  unsplashHeaders: Record<string, string | boolean>;
  pinturaConfig: { jsUrl: string; cssUrl: string } | null;
  post: CardConfigPost | undefined;
  snippets: CardConfigSnippet[];
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
  feature: { transistor: boolean; paywallImprovements: boolean };
  deprecated: { headerV1: boolean };
  membersEnabled: boolean;
  siteTitle: string;
  siteDescription: string;
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

export function buildPostCardConfig(
  sources: PostCardConfigSources,
  ports: PostCardConfigPorts,
): PostCardConfig {
  const { settings, config, site, currentUser } = sources;

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
    },
    deprecated: {
      headerV1: true,
    },
    membersEnabled: getSettingValue<string>(settings, 'members_signup_access') === 'all',
    searchLinks: ports.searchLinks,
    siteTitle: getSettingValue<string>(settings, 'title') ?? '',
    siteDescription: getSettingValue<string>(settings, 'description') ?? '',
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
