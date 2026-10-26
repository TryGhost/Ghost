import type { HelpArticle } from './help-center';
import { inDays } from './help-format';
import { GENERAL_KEY, PAGE_ARTICLES, PAGE_TOPICS, type HelpPageKey } from './help-pages';
import type { HelpBilling } from './help-signals';

/*
 * What the panel suggests before the user asks anything (pure functions,
 * covered by help-suggestions.test.ts; use-help-suggestions.ts runs them over
 * the help center's article list). In order, up to three:
 *
 *   1. An account alert, if something about their Ghost(Pro) account is urgent.
 *   2. The page's articles: tagged #admin-<page> in the help center, or
 *      PAGE_ARTICLES (help-pages.ts) while none are tagged.
 *   3. Articles whose primary topic is the page's (PAGE_TOPICS).
 *   4. The help center's featured articles, for any slot left.
 *
 * Without a page (the user took it out), articles tagged #admin-general stand
 * in for 2 and 3.
 */

/**
 * The account states urgent enough to lead the suggestions, by key. Like page
 * keys, each is a contract with the help center: #admin-<key> attaches an
 * article to it, and the fallback shows while none is tagged. Never rename.
 */
export const ACCOUNT_ALERTS = {
  'payment-failed': { fallbackSlug: 'troubleshooting-payment-issues' },
  'trial-ending': { fallbackSlug: 'manage-your-subscription' },
} as const;

export type HelpAccountAlertKey = keyof typeof ACCOUNT_ALERTS;

export interface HelpAccountAlert {
  key: HelpAccountAlertKey;
  /** Why it's suggested, as the user sees it */
  reason: string;
  /** The article it shows while none is tagged for it */
  fallbackSlug: string;
}

// How soon a trial's end is worth leading with: early enough to act, late
// enough not to nag for the whole trial
const TRIAL_ENDING_DAYS = 3;

/**
 * Something about the user's Ghost(Pro) account urgent enough to lead the
 * suggestions with, if anything is, for those who can act on it: a failed
 * payment first, then a trial about to end.
 */
export function getAccountAlert(billing: HelpBilling): HelpAccountAlert | null {
  if (!billing.canManage) {
    return null;
  }
  if (billing.paymentFailed) {
    return {
      key: 'payment-failed',
      reason: `A payment failed. Your site will be suspended ${inDays(billing.paymentFailed.daysLeft)}`,
      fallbackSlug: ACCOUNT_ALERTS['payment-failed'].fallbackSlug,
    };
  }
  const { trialDaysLeft } = billing;
  if (trialDaysLeft !== null && trialDaysLeft <= TRIAL_ENDING_DAYS) {
    return {
      key: 'trial-ending',
      reason: `Your trial ends ${inDays(trialDaysLeft)}`,
      fallbackSlug: ACCOUNT_ALERTS['trial-ending'].fallbackSlug,
    };
  }
  return null;
}

/**
 * Where a suggestion came from, in the order above. It's on each suggestion's
 * row as data-help-source, to check what's driving a page while tagging.
 */
export type HelpSuggestionSource =
  | 'alert'
  | 'tagged'
  | 'default'
  | 'topic'
  | 'general'
  | 'featured';

export interface HelpSuggestedArticle {
  article: HelpArticle;
  source: HelpSuggestionSource;
}

const SUGGESTIONS = 3;

// Featured first, then the most recently updated: Ghost has no per-tag order,
// so featuring an article is how the help center moves it up
function byPromotion(a: HelpArticle, b: HelpArticle) {
  return Number(b.featured) - Number(a.featured) || b.updatedAt.localeCompare(a.updatedAt);
}

/** Up to three articles to suggest, in the order described at the top. */
export function getSuggestedArticles(
  articles: HelpArticle[],
  page: HelpPageKey | null,
  alert: HelpAccountAlert | null,
): HelpSuggestedArticle[] {
  const suggestions: HelpSuggestedArticle[] = [];
  const add = (candidates: HelpArticle[], source: HelpSuggestionSource) => {
    for (const article of candidates) {
      const shown = suggestions.some((suggestion) => suggestion.article.id === article.id);
      if (suggestions.length < SUGGESTIONS && !shown) {
        suggestions.push({ article, source });
      }
    }
  };
  const tagged = (key: string) =>
    articles.filter(({ adminKeys }) => adminKeys.includes(key)).sort(byPromotion);
  const bySlug = (slugs: readonly string[]) =>
    slugs.flatMap((slug) => articles.filter((article) => article.slug === slug));

  if (alert) {
    const forAlert = tagged(alert.key);
    add((forAlert.length ? forAlert : bySlug([alert.fallbackSlug])).slice(0, 1), 'alert');
  }
  if (page) {
    // Tagged articles replace the defaults outright, so the help center's
    // choice is never mixed with Admin's
    const forPage = tagged(page);
    if (forPage.length) {
      add(forPage, 'tagged');
    } else {
      add(bySlug(PAGE_ARTICLES[page]), 'default');
    }
    // The article's main topic, not any it's also tagged with: a payments
    // article tagged with analytics isn't one to lead with there
    const topics = PAGE_TOPICS[page];
    add(
      articles.filter(({ tags }) => topics.includes(tags[0]?.slug ?? '')).sort(byPromotion),
      'topic',
    );
  } else {
    add(tagged(GENERAL_KEY), 'general');
  }
  add(articles.filter(({ featured }) => featured).sort(byPromotion), 'featured');

  return suggestions;
}
