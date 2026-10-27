import React from 'react';
import { Link } from '@tryghost/admin-x-framework';
import { Badge, Button, Card } from '@tryghost/shade/components';
import { Box, Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { PayNowButton } from '@/dunning';
import { plural } from './help-format';
import type { HelpBilling, HelpSignals } from './help-signals';
import type { HelpSiteCardKind } from './help-site-card-kinds';

/*
 * What some answers show beside them about the user's own site, with a way to
 * act on it. Which answers get which is SITE_CARDS in help-site-card-kinds.ts.
 *
 * Billing answers get a card with the Ghost(Pro) subscription as the billing
 * app reports it. Other answers get only a button to the part of Admin the
 * answer is about (scheduled posts, the domain, newsletter settings): Admin
 * has that data, but a button is enough to take them there.
 */

type SiteCardAction =
  | { type: 'link'; label: string; to: string }
  | { type: 'pay'; state: NonNullable<HelpBilling['paymentFailed']> };

interface SiteCardContent {
  type: 'card';
  Icon: typeof LucideIcon.Globe;
  title: string;
  status: { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' } | null;
  rows: Array<[label: string, value: string]>;
  action: SiteCardAction | null;
}

/** Just the way to the relevant page in Admin. */
interface SiteButtonContent {
  type: 'button';
  label: string;
  to: string;
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
    type: 'card',
    Icon: LucideIcon.CreditCard,
    title: 'Ghost(Pro) subscription',
    status,
    rows: trialEndsAt ? [['Trial ends', formatDate(trialEndsAt)]] : [],
    action: { type: 'link', label: 'Manage plan', to: '/pro/billing/plans' },
  };
}

function getSiteCard(
  kind: HelpSiteCardKind,
  signals: HelpSignals,
): SiteCardContent | SiteButtonContent {
  const { billing } = signals;

  switch (kind) {
    case 'schedule':
      return { type: 'button', label: 'View scheduled posts', to: '/posts?type=scheduled' };
    case 'domain':
      // Domains are managed in Ghost(Pro) billing
      return { type: 'button', label: 'Set up a custom domain', to: '/pro/domain' };
    case 'newsletter':
      return { type: 'button', label: 'Newsletter settings', to: '/settings/newsletters' };
    case 'subscription':
      return getSubscriptionCard(billing);
    case 'payment':
      // Without a failed payment, the subscription is the thing to look at
      if (!billing.paymentFailed) {
        return getSubscriptionCard(billing);
      }
      return {
        type: 'card',
        Icon: LucideIcon.CreditCard,
        title: 'Your last payment failed',
        status: { label: 'Payment failed', variant: 'destructive' },
        rows: [
          ['Failed on', formatDate(billing.paymentFailed.paymentFailedAt)],
          ['Suspended on', formatDate(billing.paymentFailed.suspendsAt)],
        ],
        action: { type: 'pay', state: billing.paymentFailed },
      };
  }
}

interface HelpSiteCardProps extends React.ComponentProps<'div'> {
  kind: HelpSiteCardKind;
  signals: HelpSignals;
}

/** The part of the user's own site the answer is about: live billing, or the way to it. */
export function HelpSiteCard({ kind, signals, ...props }: HelpSiteCardProps) {
  const card = getSiteCard(kind, signals);

  if (card.type === 'button') {
    return (
      // The panel stays open beside the page it goes to
      <div {...props}>
        <Button size="sm" variant="outline" asChild>
          <Link to={card.to}>
            {card.label}
            <LucideIcon.ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }
  const { Icon, title, status, rows, action } = card;

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
