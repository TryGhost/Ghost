import type { HelpArticle } from './help-center';
import type { HelpBilling } from './help-signals';

/*
 * Test fixtures for the Help panel's pure functions: help center articles
 * shaped as help-center.ts produces them, and Ghost(Pro) billing states.
 */

/** An article as the help center's list provides it, with only what a test needs. */
export function article(
  slug: string,
  title: string,
  excerpt = '',
  tags: string[] = [],
  adminKeys: string[] = [],
  extra: Partial<HelpArticle> = {},
): HelpArticle {
  return {
    id: slug,
    slug,
    title,
    url: `https://ghost.org/help/${slug}/`,
    excerpt,
    searchText: excerpt,
    featured: false,
    updatedAt: '2026-01-01',
    // Slugged as Ghost does: "Ghost(Pro)" is ghost-pro
    tags: tags.map((name) => ({
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      name,
    })),
    adminKeys,
    ...extra,
  };
}

/** A failed payment, as the dunning state reports it. */
export const PAYMENT_FAILED = {
  phase: 'warning' as const,
  daysLeft: 5,
  urgent: false,
  lockDismissed: false,
  paymentFailedAt: new Date('2026-10-20'),
  suspendsAt: new Date('2026-10-31'),
};

/** The Owner's billing on a Ghost(Pro) site on a trial, changed as a test needs. */
export function billingWith(billing: Partial<HelpBilling> = {}): HelpBilling {
  return {
    canManage: true,
    status: 'trialing',
    trialEndsAt: null,
    trialDaysLeft: null,
    paymentFailed: null,
    ...billing,
  };
}
