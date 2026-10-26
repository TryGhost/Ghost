import { ACCOUNT_TOPIC } from './help-search';
import {
  GENERAL_KEY,
  PAGE_ARTICLES,
  PAGE_LABELS,
  PAGE_TOPICS,
  type HelpPageKey,
} from './help-pages';
import { SITE_CARDS } from './help-site-card-kinds';
import { ACCOUNT_ALERTS } from './help-suggestions';

/*
 * Everything the Help panel relies on the help center to have, in one place:
 * the contract between Admin and the docs team (README.md, "The contract with
 * the help center").
 *
 * - Keys: the docs team tags an article #admin-<key> to attach it to an Admin
 *   page or account state. Never rename a key; adding keys is safe.
 * - Slugs: articles Admin falls back on or shows a site card for. If one is
 *   renamed or unpublished, its fallback or card silently disappears. Check
 *   them against the live help center (getReferencedSlugs) after the docs team
 *   reorganizes.
 * - Topics: tag slugs Admin maps pages to.
 */

/** Every #admin-<key> the panel reads: page keys, account alert keys and general. */
export function getAdminKeys(): string[] {
  return [
    ...(Object.keys(PAGE_LABELS) as HelpPageKey[]),
    ...Object.keys(ACCOUNT_ALERTS),
    GENERAL_KEY,
  ];
}

/** Every article slug the panel refers to by name. */
export function getReferencedSlugs(): string[] {
  return [
    ...new Set([
      ...Object.values(PAGE_ARTICLES).flat(),
      ...Object.values(ACCOUNT_ALERTS).map(({ fallbackSlug }) => fallbackSlug),
      ...Object.keys(SITE_CARDS),
    ]),
  ].sort();
}

/** Every help center topic (tag slug) the panel refers to. */
export function getReferencedTopics(): string[] {
  return [...new Set([...Object.values(PAGE_TOPICS).flat(), ACCOUNT_TOPIC])].sort();
}
