import { formatNumber } from '@tryghost/shade/utils';
import type { EmailSendingState } from '@tryghost/admin-x-framework/api/emails';

type NonFailedEmailSendingState = Exclude<EmailSendingState, { status: 'failed' }>;

export interface EmailSendingProgressCopy {
  title: 'Preparing emails' | 'Sending emails';
  detail: string | null;
}

/**
 * The active send wording shared by post analytics and the posts list.
 * `submitted` is accepted because analytics keeps the sending UI visible while
 * its dependent post and newsletter data refreshes.
 */
export function getEmailSendingProgressCopy(
  sending: NonFailedEmailSendingState,
  estimate: string | null,
): EmailSendingProgressCopy {
  const { completed, total } = sending.progress;
  const progress = total === 0 ? null : `${formatNumber(completed)} of ${formatNumber(total)}`;

  return {
    title: sending.status === 'preparing' ? 'Preparing emails' : 'Sending emails',
    detail: [progress, estimate].filter(Boolean).join(' · ') || null,
  };
}
