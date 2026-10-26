import React from 'react';
import { Link } from '@tryghost/admin-x-framework';
import { Badge, Button, Card } from '@tryghost/shade/components';
import { Box, Inline, Text } from '@tryghost/shade/primitives';
import { formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { PayNowButton } from '@/dunning';
import { plural } from './help-format';
import type { HelpBilling, HelpSignals } from './help-signals';
import type { HelpSiteCardKind } from './help-site-card-kinds';

/*
 * The live look at the user's own site beside some answers, with a button to
 * where they can act on it. Which answers get which card is SITE_CARDS in
 * help-site-card-kinds.ts. Billing comes from the billing app.
 *
 * PROTOTYPE: the scheduled posts, domain and newsletter cards show sample
 * data (PROTOTYPE_ACCOUNT in help-signals.ts) and say so on the card.
 */

type SiteCardAction =
  | { type: 'link'; label: string; to: string }
  | { type: 'pay'; state: NonNullable<HelpBilling['paymentFailed']> };

interface SiteCardContent {
  Icon: typeof LucideIcon.Globe;
  title: string;
  status: { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' } | null;
  rows: Array<[label: string, value: string]>;
  action: SiteCardAction | null;
  /** PROTOTYPE: its data is made up, which the card says */
  sample?: boolean;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/**
 * The Ghost(Pro) subscription as the billing app reports it. Until it has,
 * the card still leads to where the plan is managed.
 */
function getSubscriptionCard(billing: HelpBilling): SiteCardContent {
  const { paymentFailed, trialDaysLeft, trialEndsAt } = billing;

  let status: SiteCardContent['status'] = billing.status
    ? { label: billing.status, variant: 'secondary' }
    : null;
  if (paymentFailed) {
    status = { label: 'Payment failed', variant: 'destructive' };
  } else if (trialDaysLeft !== null) {
    status = { label: `${plural(trialDaysLeft, 'day')} left`, variant: 'warning' };
  } else if (billing.status === 'active') {
    status = { label: 'Active', variant: 'success' };
  }

  return {
    Icon: LucideIcon.CreditCard,
    title: 'Ghost(Pro) subscription',
    status,
    rows: trialEndsAt ? [['Trial ends', formatDate(trialEndsAt)]] : [],
    action: { type: 'link', label: 'Manage plan', to: '/pro/billing/plans' },
  };
}

function getSiteCard(kind: HelpSiteCardKind, signals: HelpSignals): SiteCardContent | null {
  const { account, billing } = signals;

  switch (kind) {
    case 'schedule':
      return {
        Icon: LucideIcon.CalendarClock,
        title: account.nextScheduledPost.title,
        status: { label: 'Scheduled', variant: 'secondary' },
        rows: [
          ['Publishes', account.nextScheduledPost.publishAt],
          ['Site timezone', signals.timezone],
          ['Published posts', formatNumber(account.publishedPosts)],
        ],
        action: { type: 'link', label: 'View scheduled posts', to: '/posts?type=scheduled' },
        sample: true,
      };
    case 'domain':
      return {
        Icon: LucideIcon.Globe,
        title: signals.siteHost,
        status: account.customDomain
          ? { label: 'Connected', variant: 'success' }
          : { label: 'No custom domain', variant: 'secondary' },
        rows: [
          ['Address', signals.siteHost],
          ['Custom domain', account.customDomain ?? 'Not connected'],
          // PROTOTYPE: made up, like the rest of this card
          ['SSL', 'Active'],
        ],
        // Domains are managed in Ghost(Pro) billing
        action: billing.canManage
          ? { type: 'link', label: 'Set up a custom domain', to: '/pro/domain' }
          : null,
        sample: true,
      };
    case 'subscription':
      return getSubscriptionCard(billing);
    case 'payment':
      // Without a failed payment, the subscription is the thing to look at
      if (!billing.paymentFailed) {
        return getSubscriptionCard(billing);
      }
      return {
        Icon: LucideIcon.CreditCard,
        title: 'Your last payment failed',
        status: { label: 'Payment failed', variant: 'destructive' },
        rows: [
          ['Failed on', formatDate(billing.paymentFailed.paymentFailedAt)],
          ['Suspended on', formatDate(billing.paymentFailed.suspendsAt)],
        ],
        action: { type: 'pay', state: billing.paymentFailed },
      };
    case 'newsletter':
      return {
        Icon: LucideIcon.Mail,
        title: account.newsletter.name,
        status: account.newsletter.lastSentAt
          ? { label: 'Sending', variant: 'success' }
          : { label: 'Never sent', variant: 'secondary' },
        rows: [
          ['Subscribers', formatNumber(account.newsletter.subscribers)],
          ['Last sent', account.newsletter.lastSentAt ?? 'Never'],
        ],
        action: { type: 'link', label: 'Newsletter settings', to: '/settings/newsletters' },
        sample: true,
      };
  }
}

interface HelpSiteCardProps extends React.ComponentProps<'div'> {
  kind: HelpSiteCardKind;
  signals: HelpSignals;
}

/** The part of the user's own site the answer is about, as it is right now. */
export function HelpSiteCard({ kind, signals, ...props }: HelpSiteCardProps) {
  const card = getSiteCard(kind, signals);
  if (!card) {
    return null;
  }
  const { Icon, title, status, rows, action, sample } = card;

  return (
    <Card {...props}>
      <Box padding="md">
        <Inline align="center" gap="sm" justify="between">
          <Inline align="center" className="min-w-0" gap="sm">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <Text size="sm" weight="semibold" truncate>
              {title}
            </Text>
          </Inline>
          {status && (
            <Badge size="sm" variant={status.variant}>
              {status.label}
            </Badge>
          )}
        </Inline>
        {rows.length > 0 && (
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 text-sm">
            {rows.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt className="text-text-tertiary">{label}</dt>
                <dd className="truncate text-text-primary">{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
        {sample && (
          <Text className="mt-3" size="xs" tone="tertiary">
            Sample data in this prototype
          </Text>
        )}
        {/* The panel stays open beside the page it goes to */}
        {action?.type === 'link' && (
          <Button className="mt-4" size="sm" asChild>
            <Link to={action.to}>
              {action.label}
              <LucideIcon.ArrowRight />
            </Link>
          </Button>
        )}
        {action?.type === 'pay' && (
          <div className="mt-4">
            <PayNowButton size="sm" state={action.state} />
          </div>
        )}
      </Box>
    </Card>
  );
}
