import type { ComponentType } from 'react';
import { LucideIcon } from '@tryghost/shade/utils';
import type { PostType } from './card-config';

export interface AutocompleteLink {
  label: string;
  value: string;
}

export interface AutocompleteLinkSettings {
  postType: PostType;
  homepageUrl: string;
  paidMembersEnabled: boolean;
  donationsEnabled: boolean;
  recommendationsEnabled: boolean;
}

export interface OfferLinkSource {
  name: string;
  code: string;
}

export interface LinkSearchItem {
  id: string;
  title: string;
  url?: string | null;
  status?: string;
  visibility?: string;
  publishedAt?: string | null;
  metaText?: string;
  MetaIcon?: ComponentType<{ className?: string }>;
  metaIconTitle?: string;
}

export interface LinkSearchResultGroup {
  groupName: string;
  options: LinkSearchItem[];
}

export interface LinkSearchGroup {
  label: string;
  items: LinkSearchItem[];
}

export interface LinkDecorationSettings {
  timezone: string;
  membersEnabled: boolean;
}

export interface LatestPostSource {
  id: string;
  title: string;
  url?: string | null;
  visibility?: string;
  published_at?: string | null;
}

export interface SearchIndexPost {
  id: string;
  title: string;
  url?: string | null;
  status?: string;
  visibility?: string;
  published_at?: string | null;
}

export interface SearchIndexEntity {
  id: string;
  name: string;
  url?: string | null;
}

export function buildOfferLinks(
  offers: OfferLinkSource[],
  homepageUrl: string,
): AutocompleteLink[] {
  return offers.map((offer) => ({
    label: `Offer — ${offer.name}`,
    value: `${homepageUrl}${offer.code.replace(/^\//, '')}`,
  }));
}

export function buildAutocompleteLinks(
  settings: AutocompleteLinkSettings,
  offerLinks: AutocompleteLink[],
): AutocompleteLink[] {
  const defaults = [
    { label: 'Homepage', value: settings.homepageUrl },
    { label: 'Free signup', value: '#/portal/signup/free' },
  ];

  const shareLink = [{ label: `Share ${settings.postType}`, value: '#/share' }];

  const memberLinks = settings.paidMembersEnabled
    ? [
        { label: 'Paid signup', value: '#/portal/signup' },
        { label: 'Upgrade or change plan', value: '#/portal/account/plans' },
      ]
    : [];

  const donationLink = settings.donationsEnabled
    ? [{ label: 'Tips and donations', value: '#/portal/support' }]
    : [];

  const recommendationLink = settings.recommendationsEnabled
    ? [{ label: 'Recommendations', value: '#/portal/recommendations' }]
    : [];

  const giftLink = settings.paidMembersEnabled
    ? [{ label: 'Gift subscriptions', value: '#/portal/gift' }]
    : [];

  return [
    ...defaults,
    ...memberLinks,
    ...donationLink,
    ...giftLink,
    ...shareLink,
    ...recommendationLink,
    ...offerLinks,
  ];
}

// Published dates use `D MMM YYYY` in the site's timezone.
export function formatPublishedDate(publishedAt: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: timezone,
  }).formatToParts(new Date(publishedAt));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('day')} ${part('month')} ${part('year')}`;
}

export function decoratePostSearchResult(
  item: LinkSearchItem,
  settings: LinkDecorationSettings,
): LinkSearchItem {
  const decorated: LinkSearchItem = { ...item };

  if (item.publishedAt) {
    decorated.metaText = formatPublishedDate(item.publishedAt, settings.timezone);
  }

  if (settings.membersEnabled && item.visibility) {
    if (item.visibility === 'members') {
      decorated.MetaIcon = LucideIcon.Lock;
      decorated.metaIconTitle = 'Members only';
    } else if (item.visibility === 'paid') {
      decorated.MetaIcon = LucideIcon.DollarSign;
      decorated.metaIconTitle = 'Paid-members only';
    } else if (item.visibility === 'tiers') {
      decorated.MetaIcon = LucideIcon.DollarSign;
      decorated.metaIconTitle = 'Specific tiers only';
    }
  }

  return decorated;
}

export function filterLinkSearchResults(
  results: LinkSearchResultGroup[],
  settings: LinkDecorationSettings,
): LinkSearchGroup[] {
  const filteredResults: LinkSearchGroup[] = [];

  results.forEach((group) => {
    // only content with a public URL is linkable
    let items = group.options.filter((item) => item.url);

    if (group.groupName === 'Posts' || group.groupName === 'Pages') {
      items = items.filter((item) => item.status === 'published');
    }

    if (group.groupName === 'Staff') {
      items = items.filter((item) => !/\/404\//.test(item.url ?? ''));
    }

    if (items.length === 0) {
      return;
    }

    if (group.groupName === 'Posts' || group.groupName === 'Pages') {
      items = items.map((item) => decoratePostSearchResult(item, settings));
    }

    filteredResults.push({
      label: group.groupName,
      items,
    });
  });

  return filteredResults;
}

export function buildLatestPostsGroup(
  posts: LatestPostSource[],
  settings: LinkDecorationSettings,
): LinkSearchGroup[] {
  const items = posts.map((post) =>
    decoratePostSearchResult(
      {
        id: post.id,
        title: post.title,
        url: post.url,
        visibility: post.visibility,
        publishedAt: post.published_at,
      },
      settings,
    ),
  );

  return [{ label: 'Latest posts', items }];
}

export function searchIndexPostsGroup(
  groupName: 'Posts' | 'Pages',
  entries: SearchIndexPost[],
  term: string,
): LinkSearchResultGroup {
  return {
    groupName,
    options: matchTerm(entries, term, (entry) => entry.title).map((entry) => ({
      id: `${groupName === 'Posts' ? 'post' : 'page'}.${entry.id}`,
      title: entry.title,
      url: entry.url,
      status: entry.status,
      visibility: entry.visibility,
      publishedAt: entry.published_at,
    })),
  };
}

export function searchIndexEntitiesGroup(
  groupName: 'Staff' | 'Tags',
  entries: SearchIndexEntity[],
  term: string,
): LinkSearchResultGroup {
  return {
    groupName,
    options: matchTerm(entries, term, (entry) => entry.name).map((entry) => ({
      id: `${groupName === 'Staff' ? 'user' : 'tag'}.${entry.id}`,
      title: entry.name,
      url: entry.url,
    })),
  };
}

function matchTerm<Entry>(entries: Entry[], term: string, text: (entry: Entry) => string) {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return [];
  }

  return entries.filter((entry) => text(entry).toLowerCase().includes(needle));
}
