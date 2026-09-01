import type { DunningState } from './use-dunning-state';

/** Destination of the "Pay now" CTA: the host's billing app route. */
export const PAY_URL = '#/pro';

/** Destination of the "Download my data" CTA: the export tools in settings. */
export const EXPORT_URL = '#/settings/migration';

export function formatDeadline(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function daysLeftLabel(daysLeft: number): string {
  return daysLeft === 1 ? '1 day' : `${daysLeft} days`;
}

export function bannerTitle(state: DunningState, isOwner: boolean): string {
  if (isOwner) {
    return state.urgent ? 'Action needed: payment failed.' : 'Your payment didn’t go through.';
  }
  return state.urgent ? 'Payment still failing.' : 'This site’s payment failed.';
}

export function bannerMessage(state: DunningState, isOwner: boolean): string {
  const deadline = formatDeadline(state.suspendsAt);
  const remaining = daysLeftLabel(state.daysLeft);
  if (isOwner) {
    return `Update your payment details by ${deadline} to avoid suspension — ${remaining} left.`;
  }
  return `Remind the site owner to pay the outstanding invoice before ${deadline} to avoid suspension (${remaining} left).`;
}

export function lockedHeadline(daysLeft: number): string {
  if (daysLeft === 0) {
    return 'Your site will be suspended soon';
  }
  if (daysLeft === 1) {
    return 'Your site will be suspended tomorrow';
  }
  return `Your site will be suspended in ${daysLeft} days`;
}

export function lockedMessage(state: DunningState, isOwner: boolean): string {
  const failedOn = formatDeadline(state.paymentFailedAt);
  if (isOwner) {
    return `Your last payment failed on ${failedOn} and reminders have gone unanswered. Pay the outstanding invoice to keep publishing.`;
  }
  return `The last payment failed on ${failedOn} and reminders have gone unanswered. Remind the site owner to pay the outstanding invoice to keep publishing.`;
}
