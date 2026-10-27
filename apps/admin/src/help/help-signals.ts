import { useMemo } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useCanAccessBilling, useSubscriptionStatus } from '@/billing/api';
import { useDunningState } from '@/dunning';
import type { HelpArticle } from './help-center';
import { plural } from './help-format';
import { getPageKey, PAGE_LABELS, type HelpPageKey } from './help-pages';

/*
 * What the Help panel knows about the user, used to pick and rank articles,
 * and the context a message to support carries:
 *
 * - The page they're on, as a page key (help-pages.ts).
 * - Who they are and their staff role, the site's address and timezone.
 * - Their Ghost(Pro) subscription, as the billing app reports it to Admin
 *   (trial, status, a failed payment), as Admin's upgrade banner and dunning
 *   warnings use it. Empty until the billing app reports.
 *
 * Search runs in the browser, so none of this leaves it with a question.
 */

type HelpDunning = NonNullable<ReturnType<typeof useDunningState>>;

/** The site's Ghost(Pro) subscription, as the billing app reports it. */
export interface HelpBilling {
  /** Whether the user can see and act on it: the Owner, on a Ghost(Pro) site */
  canManage: boolean;
  /** Eg. trialing or active; null until the billing app reports */
  status: string | null;
  trialEndsAt: Date | null;
  trialDaysLeft: number | null;
  /** A failed payment, while it's in effect */
  paymentFailed: HelpDunning | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function useHelpBilling(): HelpBilling {
  const subscription = useSubscriptionStatus()?.subscription;
  const canManage = useCanAccessBilling() === true;
  const paymentFailed = useDunningState();
  const status = subscription?.status ?? null;
  const trialEnd = subscription?.isActiveTrial ? (subscription.trial_end ?? null) : null;
  // The dunning state is a new object on every render; its dates are what change
  const failedAt = paymentFailed?.paymentFailedAt.getTime();
  const daysToSuspension = paymentFailed?.daysLeft;

  // Kept stable while nothing changes, so the signals (and everything built
  // on them) are too
  return useMemo(() => {
    const trialEndsAt = trialEnd ? new Date(trialEnd) : null;
    return {
      canManage,
      status,
      trialEndsAt,
      trialDaysLeft: trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / DAY_MS))
        : null,
      paymentFailed,
    };
    // paymentFailed is read through its dates
  }, [canManage, status, trialEnd, failedAt, daysToSuspension]);
}

export interface HelpSignals {
  pageKey: HelpPageKey;
  pageLabel: string;
  user: { name: string; email: string; profileImage: string | null };
  /** Their staff role, eg. Owner or Editor */
  role: string;
  siteHost: string;
  timezone: string;
  billing: HelpBilling;
}

function getHost(url: string | undefined) {
  try {
    return url ? new URL(url).host : '';
  } catch {
    return '';
  }
}

/** What the help panel knows about where the user is and the state of their site. */
export function useHelpSignals(): HelpSignals {
  const { pathname } = useLocation();
  const { data: currentUser } = useCurrentUser();
  const { data: siteData } = useBrowseSite();
  const { data: settingsData } = useBrowseSettings();
  const billing = useHelpBilling();

  const pageKey = getPageKey(pathname);
  const siteUrl = siteData?.site.url;
  const timezone = getSettingValue<string>(settingsData?.settings, 'timezone') ?? 'Etc/UTC';

  return useMemo(
    () => ({
      pageKey,
      pageLabel: PAGE_LABELS[pageKey],
      user: {
        name: currentUser?.name ?? '',
        email: currentUser?.email ?? '',
        profileImage: currentUser?.profile_image ?? null,
      },
      role: currentUser?.roles[0]?.name ?? 'Staff',
      siteHost: getHost(siteUrl),
      timezone,
      billing,
    }),
    [pageKey, currentUser, siteUrl, timezone, billing],
  );
}

/** The Ghost(Pro) subscription in a few words, or null until the billing app reports it. */
export function describeBilling({ status, trialDaysLeft, paymentFailed }: HelpBilling) {
  if (paymentFailed) {
    return 'payment failed';
  }
  if (trialDaysLeft !== null) {
    return `trial, ${plural(trialDaysLeft, 'day')} left`;
  }
  return status;
}

/**
 * What the panel had to go on for a question, shown behind its chevron: the
 * page (unless the user took it out) and the signals ranking and site cards
 * use. Nothing here is sent anywhere.
 */
export function getQuestionContext(signals: HelpSignals, withPage: boolean) {
  const billing = describeBilling(signals.billing);
  return [
    withPage ? `Page: ${signals.pageLabel}` : 'Page: left out',
    `Role: ${signals.role}`,
    ...(billing ? [`Ghost(Pro): ${billing}`] : []),
    `Site: ${signals.siteHost}`,
  ];
}

interface SupportContextOptions {
  signals: HelpSignals;
  /**
   * The page the user's last question was asked from: its label, null if they
   * left it out, or undefined when they haven't asked anything (then it's the
   * page they're on)
   */
  questionPage: string | null | undefined;
  questionCount: number;
  openedArticles: HelpArticle[];
}

/**
 * The context a message to support carries when the conversation is attached
 * (on by default on the support form), so the support team doesn't have to
 * ask. PROTOTYPE: it's what a real send should include, as nothing is sent
 * yet; the form itself no longer lists it.
 */
export function getSupportContext({
  signals,
  questionPage,
  questionCount,
  openedArticles,
}: SupportContextOptions): Array<[label: string, value: string]> {
  const page = questionPage === undefined ? signals.pageLabel : questionPage;
  const billing = describeBilling(signals.billing);

  return [
    ['Page', page ?? 'Left out of the question'],
    ['Role', signals.role],
    ['Site', signals.siteHost],
    ...(billing ? [['Ghost(Pro)', billing] as [string, string]] : []),
    ...(questionCount
      ? [['Conversation', plural(questionCount, 'question')] as [string, string]]
      : []),
    ...(openedArticles.length
      ? [['Articles read', openedArticles.map(({ title }) => title).join(', ')] as [string, string]]
      : []),
  ];
}
