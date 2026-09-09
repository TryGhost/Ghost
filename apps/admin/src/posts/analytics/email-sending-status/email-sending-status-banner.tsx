import { Banner, Button } from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { useEmailSendingStatusContext } from './email-sending-status-context';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { getEmailSendingProgressCopy } from '@/posts/email-sending-status/email-sending-status-copy';
import { useSendingEta } from '@/posts/email-sending-status/use-sending-eta';
import type { EmailSendingState } from '@tryghost/admin-x-framework/api/emails';

const FILL_CLIP_ID = 'email-sending-fill-clip';

/** A grey level rising over a white face and dropping back, on the arrow's tempo. */
const FillingGlyph = () => (
  <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
    {/* Wider than the 4.8 face: cut to the same radius, the two anti-aliased
        edges stack and the white bleeds through as a pale ring. */}
    <clipPath id={FILL_CLIP_ID}>
      <circle cx="6" cy="6" r="5.1" />
    </clipPath>
    <circle cx="6" cy="6" fill="currentColor" r="4.8" />
    {/* Clip on the group, animation on the child: a transform on a clipped
        element carries its own clip path along with it. */}
    <g clipPath={`url(#${FILL_CLIP_ID})`}>
      <rect
        className="animate-email-sending-fill-rise fill-muted-foreground motion-reduce:translate-y-1/2 motion-reduce:animate-none"
        height="12"
        width="12"
        x="0"
        y="0"
      />
    </g>
  </svg>
);

const StatusGlyph = ({ sending }: { sending: EmailSendingState }) => {
  if (sending.status === 'preparing') {
    return (
      <span className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted-foreground text-white ring-1 ring-muted-foreground ring-offset-1 ring-offset-background">
        <FillingGlyph />
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

const activeDetail = (sending: Exclude<EmailSendingState, { status: 'failed' }>) => {
  const { completed, total } = sending.progress;

  if (total === 0) {
    return null;
  }

  // Preparation reports a percentage so the recipient count only climbs
  // once, during sending, while the audience size stays on screen throughout.
  if (sending.status === 'preparing') {
    const percent = Math.min(100, Math.floor((completed / total) * 100));
    return `${formatNumber(percent)}% complete · ${formatNumber(total)} total`;
  }

  return getEmailSendingProgressCopy(sending, null).detail;
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
  const { status, isNewsletterDataHidden, hasUnknownDeliveryOutcome, isRetrying, retrySending } =
    useEmailSendingStatusContext();
  const sending = status?.sending;
  const estimate = useSendingEta(status);

  if (!sending || (sending.status === 'submitted' && !isNewsletterDataHidden)) {
    return null;
  }

  const isFailed = sending.status === 'failed';
  const hasSentEmails = isFailed
    ? !hasUnknownDeliveryOutcome &&
      sending.failed_during === 'submitting' &&
      sending.progress.completed > 0
    : false;
  let title: string;
  let detail: string | null;

  if (sending.status === 'failed') {
    title = hasSentEmails ? 'Some emails failed to send' : 'Emails failed to send';
    detail = hasUnknownDeliveryOutcome
      ? post?.email?.error || 'Something went wrong while sending this email.'
      : failureDetail(sending, post?.email?.error);
  } else {
    const progressCopy = getEmailSendingProgressCopy(sending, null);
    title = progressCopy.title;
    detail = activeDetail(sending);
  }

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
        {!isFailed && estimate && (
          <Text className="shrink-0 tabular-nums" size="sm" tone="secondary">
            {estimate}
          </Text>
        )}
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
