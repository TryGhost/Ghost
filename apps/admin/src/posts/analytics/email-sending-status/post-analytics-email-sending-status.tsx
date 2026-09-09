import { Button } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { useEmailSendingStatusContext } from './email-sending-status-context';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { getEmailSendingLine } from '@/posts/email-sending-status/email-sending-status-copy';
import { EmailSendingStatusLine } from '@/posts/email-sending-status/email-sending-status-line';
import { useChangeCount } from '@/posts/email-sending-status/use-change-count';
import { useSendingEta } from '@/posts/email-sending-status/use-sending-eta';
import type { EmailSendingState } from '@tryghost/admin-x-framework/api/emails';

// Use `fade-in-0`, not `fade-in`: Ember's ghost.css has its own `.fade-in`
// that leaves content at opacity 0.
const CROSSFADE = 'animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none';

const failureDetail = (
  sending: Extract<EmailSendingState, { status: 'failed' }>,
  error?: string | null,
) => {
  const { completed, total } = sending.progress;
  // Submission progress includes exclusions, so it cannot be presented as emails sent.
  const processed = sending.failed_during === 'submitting' ? completed : 0;
  const progress =
    processed > 0
      ? `${formatNumber(processed)} of ${formatNumber(total)} recipients processed.`
      : total > 0
        ? `None of the ${formatNumber(total)} emails were sent.`
        : 'No emails were sent.';

  return error ? `${progress} ${error}` : progress;
};

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
  const isFailed = sending?.status === 'failed';
  // After load, a swap between the failure and the sending line animates the
  // new one in, and the old one goes at once rather than fading out.
  const swapCount = useChangeCount(isFailed, !isStatusLoading);

  if (isFailed) {
    const detail = hasUnknownDeliveryOutcome
      ? post?.email?.error || 'Something went wrong while sending this email.'
      : failureDetail(sending, post?.email?.error);

    return (
      <Inline
        className={cn(
          'leading-[1.65em] text-muted-foreground tabular-nums',
          swapCount > 0 && CROSSFADE,
        )}
        data-testid="email-sending-status-line"
        gap="xs"
        role="alert"
        wrap
      >
        <span className="font-medium text-state-danger">
          Emails failed to send
        </span>
        <span aria-hidden="true">·</span>
        <span>{detail}</span>
        {!hasUnknownDeliveryOutcome && (
          <Button
            className="h-auto p-0 text-[length:inherit] leading-[inherit]"
            disabled={isRetrying}
            variant="link"
            onClick={() => void retrySending()}
          >
            {isRetrying ? 'Sending…' : 'Retry sending email'}
          </Button>
        )}
      </Inline>
    );
  }

  const isActive = sending && (sending.status !== 'submitted' || isNewsletterDataHidden);

  return (
    <EmailSendingStatusLine
      appear={swapCount > 0}
      data-testid="email-sending-status-line"
      line={
        isActive
          ? getEmailSendingLine(sending, { estimate, preparingProgress: 'percentage' })
          : null
      }
      ready={!isStatusLoading}
    />
  );
};

export default PostAnalyticsEmailSendingStatus;
