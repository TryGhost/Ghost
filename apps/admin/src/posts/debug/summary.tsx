import type { Email } from '@tryghost/admin-x-framework/api/content-types';
import { Badge, Card, CardContent } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn, formatNumber, formatPercentage } from '@tryghost/shade/utils';
import KpiCard, { KpiCardLabel, KpiCardValue } from '@/posts/analytics/components/kpi-card';
import { formatDebugDate, formatDuration, secondsBetween, statusLabel } from './format';

const STATUS_BADGE = {
  submitted: 'success',
  failed: 'destructive',
  pending: 'secondary',
  submitting: 'secondary',
} as const;

function Metric({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: number;
  detail?: string | null;
  className?: string;
}) {
  return (
    <KpiCard className="p-3 md:px-6 md:py-5">
      <KpiCardLabel>{label}</KpiCardLabel>
      <Inline align="baseline" gap="sm">
        <KpiCardValue className={className}>{formatNumber(value)}</KpiCardValue>
        {detail && (
          <Text as="span" size="sm" tone="secondary">
            {detail}
          </Text>
        )}
      </Inline>
    </KpiCard>
  );
}

function Setting({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <Badge className={cn(!enabled && 'text-muted-foreground')} variant="outline">
      {label} {enabled ? 'on' : 'off'}
    </Badge>
  );
}

export default function Summary({ email }: { email: Email }) {
  const sent = email.email_count ?? 0;
  const failed = email.failed_count ?? 0;
  const shareOfSent = (count: number) => (sent > 0 ? formatPercentage(count / sent) : null);
  const submitDelay = secondsBetween(email.created_at, email.submitted_at);

  return (
    <Stack gap="md">
      <Card>
        <CardContent className="grid grid-cols-2 p-0 lg:grid-cols-4 max-lg:[&>*:nth-child(-n+2)]:border-b max-lg:[&>*:nth-child(2n)]:border-r-0">
          <Metric label="Sent" value={sent} />
          <Metric
            detail={shareOfSent(email.delivered_count ?? 0)}
            label="Delivered"
            value={email.delivered_count ?? 0}
          />
          <Metric
            detail={email.track_opens ? shareOfSent(email.opened_count ?? 0) : 'Not tracked'}
            label="Opened"
            value={email.opened_count ?? 0}
          />
          <Metric
            className={cn(failed > 0 && 'text-destructive')}
            detail={failed > 0 ? shareOfSent(failed) : null}
            label="Failed"
            value={failed}
          />
        </CardContent>
      </Card>
      <Inline align="center" gap="sm" wrap>
        <Badge variant={email.status ? STATUS_BADGE[email.status] : 'secondary'}>
          {statusLabel(email.status)}
        </Badge>
        <Badge variant="outline">
          Recipient filter: <code>{email.recipient_filter || 'N/A'}</code>
        </Badge>
        <Setting enabled={email.track_opens} label="Open tracking" />
        <Setting enabled={email.track_clicks} label="Click tracking" />
        <Setting enabled={email.feedback_enabled} label="Member feedback" />
      </Inline>
      <Text size="sm" tone="secondary">
        Created {formatDebugDate(email.created_at)} · Submitted{' '}
        {formatDebugDate(email.submitted_at)}
        {submitDelay !== null && submitDelay >= 0 && ` (${formatDuration(submitDelay)} later)`}
      </Text>
    </Stack>
  );
}
