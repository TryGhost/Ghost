import type { HelpBilling } from './help-signals';

/*
 * Which answers show a site card beside them: live Ghost(Pro) billing, or a
 * button to the part of Admin the answer is about (help-site-card.tsx renders
 * them). A card is tied to the slug of the article that best answers the
 * question, so these slugs are part of the contract with the help center
 * (help-contract.ts): if an article is renamed, its card silently stops
 * showing.
 */

export type HelpSiteCardKind = 'schedule' | 'domain' | 'subscription' | 'payment' | 'newsletter';

export const SITE_CARDS: Record<string, HelpSiteCardKind> = {
  'publishing-content': 'schedule',
  'using-custom-domains': 'domain',
  'manage-your-subscription': 'subscription',
  'turn-off-auto-renew': 'subscription',
  'troubleshooting-payment-issues': 'payment',
  'setup-email-newsletters': 'newsletter',
  'delivering-emails': 'newsletter',
};

// The cards that show Ghost(Pro) billing, which the billing app reports
const BILLING_CARDS: HelpSiteCardKind[] = ['subscription', 'payment'];
// The cards only someone who can manage Ghost(Pro) billing can act on: the
// domain is managed there too
const MANAGED_IN_BILLING: HelpSiteCardKind[] = [...BILLING_CARDS, 'domain'];

/** Whether a card shows Ghost(Pro) billing, which the billing app reports. */
export function isBillingCard(kind: HelpSiteCardKind) {
  return BILLING_CARDS.includes(kind);
}

/** The site card an article's answer gets, if any: billing and domain only for those who can manage them. */
export function getSiteCardKind(
  slug: string,
  billing: Pick<HelpBilling, 'canManage'>,
): HelpSiteCardKind | null {
  const kind = SITE_CARDS[slug];
  if (!kind || (MANAGED_IN_BILLING.includes(kind) && !billing.canManage)) {
    return null;
  }
  return kind;
}
