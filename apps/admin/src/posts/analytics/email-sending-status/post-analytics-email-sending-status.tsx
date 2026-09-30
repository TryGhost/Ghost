import { Button } from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';
import { useEmailSendingStatusContext } from './email-sending-status-context';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import {
  getEmailSendingActiveLine,
  getEmailSendingProgressCopy,
  type EmailSendingActiveLine,
} from '@/posts/email-sending-status/email-sending-status-copy';
import { EmailSendingStatusLine } from '@/posts/email-sending-status/email-sending-status-line';
import { useSendingEta } from '@/posts/email-sending-status/use-sending-eta';
import type {
  EmailSendingProgress,
  EmailSendingState,
} from '@tryghost/admin-x-framework/api/emails';

/**
 * Preparation reports a percentage so the recipient count only climbs once,
 * during sending, while the audience size stays on screen throughout.
 */
const preparingDetail = ({ completed, total }: EmailSendingProgress) => {
  if (total === 0) {
    return null;
  }

  const percent = Math.min(100, Math.floor((completed / total) * 100));
  return `${formatNumber(percent)}% complete · ${formatNumber(total)} total`;
};

const failureDetail = (
  sending: Extract<EmailSendingState, { status: 'failed' }>,
  error?: string | null,
) => {
  const { completed, total } = sending.progress;
  const sent = sending.failed_during === 'submitting' ? completed : 0;
  const progress =
    sent > 0
      ? `${formatNumber(sent)} of ${formatNumber(total)} emails were sent.`
      : total > 0
        ? `None of the ${formatNumber(total)} emails were sent.`
        : 'No emails were sent.';

  return error ? `${progress} ${error}` : progress;
};

/** The email send's status, shown under the post title. */
const PostAnalyticsEmailSendingStatus = () => {
  const { post } = usePostAnalytics();
  const {
    status,
    isStatusLoading,
    isNewsletterDataHidden,
    hasUnknownDeliveryOutcome,
    isRetrying,
    retrySending,
  } = useEmailSendingStatusContext();
  const sending = status?.sending;
  const estimate = useSendingEta(status);

  if (sending?.status === 'failed') {
    const hasSentEmails =
      !hasUnknownDeliveryOutcome &&
      sending.failed_during === 'submitting' &&
      sending.progress.completed > 0;
    const detail = hasUnknownDeliveryOutcome
      ? post?.email?.error || 'Something went wrong while sending this email.'
      : failureDetail(sending, post?.email?.error);

    return (
      <EmailSendingStatusLine
        active={null}
        data-testid="email-sending-status-line"
        failure={
          <>
            <span className="font-medium text-state-danger">
              {hasSentEmails ? 'Some emails failed to send' : 'Emails failed to send'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{detail}</span>
            {!hasUnknownDeliveryOutcome && (
              <Button
                // Match the surrounding text size.
                className="h-auto p-0 text-[length:inherit] leading-[inherit]"
                disabled={isRetrying}
                variant="link"
                onClick={() => void retrySending()}
              >
                {isRetrying
                  ? 'Sending…'
                  : hasSentEmails
                    ? 'Send remaining emails'
                    : 'Retry sending email'}
              </Button>
            )}
          </>
        }
        ready={!isStatusLoading}
      />
    );
  }

  const isActive = sending && (sending.status !== 'submitted' || isNewsletterDataHidden);
  let active: EmailSendingActiveLine | null = null;
  if (isActive) {
    const copy = getEmailSendingProgressCopy(sending, estimate);
    active = getEmailSendingActiveLine(
      sending,
      sending.status === 'preparing'
        ? { ...copy, detail: preparingDetail(sending.progress) }
        : copy,
    );
  }

  return (
    <EmailSendingStatusLine
      active={active}
      data-testid="email-sending-status-line"
      ready={!isStatusLoading}
    />
  );
};

export default PostAnalyticsEmailSendingStatus;
