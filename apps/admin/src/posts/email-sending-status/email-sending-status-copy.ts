import { formatNumber } from '@tryghost/shade/utils';
import type {
  EmailSendingPhase,
  EmailSendingProgress,
  EmailSendingState,
} from '@tryghost/admin-x-framework/api/emails';

interface ActiveEmailSend {
  status: Exclude<EmailSendingState, { status: 'failed' }>['status'];
  progress?: EmailSendingProgress;
}

interface EmailSendingLineOptions {
  estimate?: string | null;
  /**
   * Post analytics shows preparation as a percentage so the recipient count
   * only climbs once, during sending, while the audience size stays on screen.
   */
  preparingProgress?: 'count' | 'percentage';
}

export interface EmailSendingLine {
  phase: EmailSendingPhase;
  /** 0 to 1, or null before the total is known. */
  fractionComplete: number | null;
  text: string;
}

/**
 * The active send wording shared by post analytics and the posts list.
 * `submitted` is accepted because analytics keeps the sending UI visible while
 * its dependent post and newsletter data refreshes.
 */
export function getEmailSendingLine(
  { status, progress }: ActiveEmailSend,
  { estimate = null, preparingProgress = 'count' }: EmailSendingLineOptions = {},
): EmailSendingLine {
  const phase = status === 'preparing' ? 'preparing' : 'submitting';
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? 0;
  let progressText: string | null = null;

  if (total > 0) {
    const percent = Math.min(100, Math.floor((completed / total) * 100));
    progressText =
      phase === 'preparing' && preparingProgress === 'percentage'
        ? `${formatNumber(percent)}% complete · ${formatNumber(total)} total`
        : `${formatNumber(completed)} of ${formatNumber(total)}`;
  }

  return {
    phase,
    fractionComplete: total > 0 ? completed / total : null,
    text: [phase === 'preparing' ? 'Preparing emails' : 'Sending emails', progressText, estimate]
      .filter(Boolean)
      .join(' · '),
  };
}
