import { Banner, Button } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { useEmailSendingStatusContext } from './email-sending-status-context';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import type { EmailSendingState } from '@tryghost/admin-x-framework/api/emails';
import type { ReactNode } from 'react';

const formatEta = (seconds: number): string => {
  if (seconds > 80) {
    const minutes = Math.round(seconds / 60);
    return `About ${formatNumber(minutes)} ${minutes === 1 ? 'minute' : 'minutes'} left`;
  }
  if (seconds > 40) {
    return 'About 1 minute left';
  }
  return 'Less than 1 minute left';
};

const HalfFullGlyph = () => (
  <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
    <path d="M1.2 6 A4.8 4.8 0 0 1 10.8 6 Z" fill="currentColor" />
  </svg>
);

const StatusGlyph = ({ sending }: { sending: EmailSendingState }) => {
  if (sending.status === 'preparing') {
    return (
      <span className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted-foreground text-white ring-1 ring-muted-foreground ring-offset-1 ring-offset-background">
        <HalfFullGlyph />
      </span>
    );
  }

  if (sending.status === 'failed') {
    return (
      <span className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-state-danger text-white ring-1 ring-state-danger ring-offset-1 ring-offset-background">
        <LucideIcon.X aria-hidden="true" size={12} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-state-info text-white ring-1 ring-state-info ring-offset-1 ring-offset-background">
      <span className="animate-email-sending-arrow-rise motion-reduce:animate-none">
        <LucideIcon.ArrowUp aria-hidden="true" size={12} strokeWidth={2.5} />
      </span>
    </span>
  );
};

const activeDetail = (sending: Exclude<EmailSendingState, { status: 'failed' }>): ReactNode => {
  const { completed, total, estimated_seconds_remaining: eta } = sending.progress;
  const estimate = eta === null ? null : formatEta(eta);

  if (total === 0) {
    return estimate;
  }

  return (
    <>
      <span className="inline-block min-w-[7ch] text-right">{formatNumber(completed)}</span>
      {` of ${formatNumber(total)}`}
      {estimate && ` · ${estimate}`}
    </>
  );
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

const EmailSendingStatusBanner = () => {
  const { post } = usePostAnalytics();
  const { status, hasUnknownDeliveryOutcome, isRetrying, retrySending } =
    useEmailSendingStatusContext();
  const sending = status?.sending;

  if (!sending || sending.status === 'submitted') {
    return null;
  }

  const isFailed = sending.status === 'failed';
  const hasSentEmails = isFailed
    ? !hasUnknownDeliveryOutcome &&
      sending.failed_during === 'submitting' &&
      sending.progress.completed > 0
    : false;
  const title = isFailed
    ? hasSentEmails
      ? 'Some emails failed to send'
      : 'Emails failed to send'
    : sending.status === 'preparing'
      ? 'Preparing emails'
      : 'Sending emails';
  const detail = isFailed
    ? hasUnknownDeliveryOutcome
      ? post?.email?.error || 'Something went wrong while sending this email.'
      : failureDetail(sending, post?.email?.error)
    : activeDetail(sending);
  const retryLabel = hasSentEmails ? 'Send remaining emails' : 'Retry sending email';

  return (
    <Banner
      className="bg-surface-elevated shadow-none hover:shadow-none"
      data-testid="email-sending-status-banner"
      role={isFailed ? 'alert' : 'status'}
      size="lg"
    >
      <Inline align="center" gap="md" justify="between" wrap>
        <Inline align="center" className="min-w-0" gap="sm">
          <StatusGlyph sending={sending} />
          <Text className="min-w-0 tabular-nums" size="sm">
            <Text as="strong" size="sm" weight="semibold">
              {title}
            </Text>
            {detail && (
              <Text as="span" size="sm" tone="secondary">
                {' · '}
                {detail}
              </Text>
            )}
          </Text>
        </Inline>
        {isFailed && !hasUnknownDeliveryOutcome && (
          <Button
            className="shrink-0"
            disabled={isRetrying}
            size="sm"
            variant="outline"
            onClick={() => void retrySending()}
          >
            {isRetrying ? 'Sending…' : retryLabel}
          </Button>
        )}
      </Inline>
    </Banner>
  );
};

export default EmailSendingStatusBanner;
