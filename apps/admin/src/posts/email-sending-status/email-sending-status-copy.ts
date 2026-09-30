import { formatNumber } from '@tryghost/shade/utils';
import type { EmailSendingPhase, EmailSendingState } from '@tryghost/admin-x-framework/api/emails';

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

/** An active send's status line. Each screen supplies its own wording. */
export interface EmailSendingLine {
  phase: EmailSendingPhase;
  /** 0 to 1, or null before the total is known. */
  fractionComplete: number | null;
  text: string;
}

export function getEmailSendingLine(
  sending: NonFailedEmailSendingState,
  { title, detail }: EmailSendingProgressCopy,
): EmailSendingLine {
  const { completed, total } = sending.progress;

  return {
    phase: sending.status === 'preparing' ? 'preparing' : 'submitting',
    fractionComplete: total > 0 ? completed / total : null,
    text: detail ? `${title} · ${detail}` : title,
  };
}
