import { Button } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { useEmailSendingStatusContext } from './email-sending-status-context';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import type { EmailSendingState } from '@tryghost/admin-x-framework/api/emails';
import type { ReactNode } from 'react';

const formatEta = (seconds: number): string => {
  if (seconds > 80) {
    return `About ${formatNumber(Math.ceil(seconds / 60))} minutes left`;
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
      <span className="email-sending-arrow-rise">
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
  const progress =
    completed > 0
      ? `${formatNumber(completed)} of ${formatNumber(total)} emails were sent.`
      : total > 0
        ? `None of the ${formatNumber(total)} emails were sent.`
        : 'No emails were sent.';

  return error ? `${progress} ${error}` : progress;
};

const EmailSendingStatusBanner = () => {
  const { post } = usePostAnalytics();
  const { status, isRetrying, retrySending } = useEmailSendingStatusContext();
  const sending = status?.sending;

  if (!sending || sending.status === 'submitted') {
    return null;
  }

  const isFailed = sending.status === 'failed';
  const title = isFailed
    ? sending.progress.completed > 0
      ? 'Some emails failed to send'
      : 'Emails failed to send'
    : sending.status === 'preparing'
      ? 'Preparing emails'
      : 'Sending emails';
  const detail = isFailed ? failureDetail(sending, post?.email?.error) : activeDetail(sending);
  const retryLabel =
    sending.progress.completed > 0 ? 'Send remaining emails' : 'Retry sending email';

  return (
    <Stack
      className="rounded-lg border border-border-default bg-surface-elevated p-4"
      data-testid="email-sending-status-banner"
      gap="none"
      role={isFailed ? 'alert' : 'status'}
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
        {isFailed && (
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
    </Stack>
  );
};

export default EmailSendingStatusBanner;
