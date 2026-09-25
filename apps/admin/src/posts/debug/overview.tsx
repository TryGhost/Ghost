import type { ReactNode } from 'react';
import type { Email } from '@tryghost/admin-x-framework/api/content-types';
import {
  type EmailDebugBatch,
  type EmailRecipientFailure,
  useEmailAnalyticsStatus,
} from '@tryghost/admin-x-framework/api/emails';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Indicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue } from '@tryghost/shade/patterns';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber, formatPercentage } from '@tryghost/shade/utils';
import { JOBS, hasJobActivity } from './jobs';
import { formatDuration, formatSyncTime, secondsBetween, statusLabel } from './format';
import { groupFailures } from './group-failures';

export type DebugTab = 'overview' | 'failures' | 'batches' | 'analytics';

type Tone = 'ok' | 'off' | 'info' | 'error';

interface Check {
  key: string;
  tone: Tone;
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}

const ICONS: Record<Tone, ReactNode> = {
  ok: <LucideIcon.CircleCheck className="size-4 text-green" />,
  off: <LucideIcon.CircleMinus className="size-4 text-muted-foreground" />,
  info: <LucideIcon.Info className="size-4 text-muted-foreground" />,
  error: <LucideIcon.CircleX className="size-4 text-destructive" />,
};

// KpiCardHeader draws a right border on every cell but the last; on the two-column
// layout the second cell also ends a row, and the top pair needs a divider below.
const STACKED_GRID = 'max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(2n)]:border-r-0';

function plural(count: number, one: string, many = `${one}s`) {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}

function Metric({
  label,
  color,
  value,
  share,
}: {
  label: string;
  color: string;
  value: number;
  share?: string | null;
}) {
  return (
    <KpiCardHeader>
      <Stack gap="xs">
        <KpiCardHeaderLabel color={color}>{label}</KpiCardHeaderLabel>
        <KpiCardHeaderValue
          diffDirection={share ? 'empty' : undefined}
          diffValue={share ?? undefined}
          value={formatNumber(value)}
        />
      </Stack>
    </KpiCardHeader>
  );
}

function CheckRow({ check }: { check: Check }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-[1lh] shrink-0 items-center self-start">{ICONS[check.tone]}</span>
      <Stack className="min-w-0 grow" gap="none">
        <span className={cn(check.tone === 'off' && 'text-muted-foreground')}>{check.title}</span>
        {check.detail && (
          <Text className="break-words" size="sm" tone="secondary">
            {check.detail}
          </Text>
        )}
      </Stack>
      {check.action && <div className="shrink-0">{check.action}</div>}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap="none">
      <Text size="sm" tone="secondary">
        {label}
      </Text>
      <span className="text-sm">{children}</span>
    </Stack>
  );
}

function DateTime({ value, timezone }: { value?: string | null; timezone: string }) {
  const utc = formatSyncTime(value, { year: true });
  const local = formatSyncTime(value, { year: true, timezone });
  if (!utc) {
    return <>N/A</>;
  }
  return (
    <Stack className="tabular-nums" gap="none">
      <span>{utc.date}</span>
      <Text as="span" size="sm" tone="secondary">
        {utc.time} UTC
      </Text>
      {local && local.offsetNanoseconds !== 0 && (
        <Text as="span" size="sm" tone="secondary">
          {local.date === utc.date ? local.time : `${local.date}, ${local.time}`} {timezone}
        </Text>
      )}
    </Stack>
  );
}

function batchesCheck(
  email: Email,
  batches: EmailDebugBatch[],
  postId: string,
  view: ReactNode,
): Check {
  const failed = batches.filter((batch) => batch.status === 'failed');
  const unsent = batches.filter(
    (batch) => batch.status === 'pending' || batch.status === 'submitting',
  );
  const total = plural(batches.length, 'batch', 'batches');

  if (email.status === 'failed' || failed.length) {
    return {
      key: 'batches',
      tone: 'error',
      title: failed.length
        ? `${formatNumber(failed.length)} of ${total} failed`
        : 'Email failed to send',
      detail: email.error || failed[0]?.error_message,
      action: (
        <Inline gap="xs">
          {view}
          {email.status === 'failed' && (
            <Button size="sm" variant="outline" asChild>
              <a href={`#/editor/post/${postId}`}>Retry</a>
            </Button>
          )}
        </Inline>
      ),
    };
  }
  if (email.status === 'pending' || email.status === 'submitting' || unsent.length) {
    return {
      key: 'batches',
      tone: 'info',
      title: unsent.length
        ? `${formatNumber(unsent.length)} of ${total} not sent yet`
        : 'Sending in progress',
      action: view,
    };
  }
  const delay = secondsBetween(email.created_at, email.submitted_at);
  return {
    key: 'batches',
    tone: 'ok',
    title: batches.length ? `Sent in ${total}` : `Status: ${statusLabel(email.status)}`,
    detail:
      delay === null
        ? undefined
        : delay < 1
          ? 'Submitted immediately'
          : `Submitted ${formatDuration(delay)} after creation`,
    action: view,
  };
}

function failuresCheck(failures: EmailRecipientFailure[], sent: number, view: ReactNode): Check {
  if (!failures.length) {
    return { key: 'failures', tone: 'ok', title: 'No recipient failures' };
  }
  const [top] = groupFailures(failures);
  const code = top.enhancedCode ? `${top.code} ${top.enhancedCode}` : top.code;
  return {
    key: 'failures',
    tone: 'info',
    title: (
      <>
        {plural(failures.length, 'recipient')} failed
        {sent > 0 && (
          <Text as="span" tone="secondary">
            {' '}
            ({formatPercentage(failures.length / sent)})
          </Text>
        )}
      </>
    ),
    detail: `Most common: ${code} ${top.message} · ${plural(top.failures.length, 'recipient')}`,
    action: view,
  };
}

function settingCheck(key: string, label: string, enabled?: boolean): Check {
  return { key, tone: enabled ? 'ok' : 'off', title: `${label} ${enabled ? 'on' : 'off'}` };
}

function AnalyticsSummary({ emailId, onView }: { emailId: string; onView: () => void }) {
  const { data, isError } = useEmailAnalyticsStatus(emailId, {
    refetchInterval: 5000,
    retry: false,
    defaultErrorHandler: false,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 py-4">
        <CardTitle>Analytics sync</CardTitle>
        <Button size="sm" variant="ghost" onClick={onView}>
          View details
        </Button>
      </CardHeader>
      {hasJobActivity(data) ? (
        <CardContent className="border-t p-0">
          <Table className="[&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6 [&_tr:last-child]:border-b-0">
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Fetched through (UTC)</TableHead>
                <TableHead className="text-right">Behind</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {JOBS.map(([key, label]) => {
                const job = data?.[key];
                const through = formatSyncTime(job?.fetchedThrough, { year: true });
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <Inline align="center" gap="sm">
                        {label}
                        {job?.running && (
                          <Indicator size="sm" state="active" title="Running" variant="success" />
                        )}
                      </Inline>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {through ? (
                        `${through.date}, ${through.time}`
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {typeof job?.lagSeconds === 'number' ? (
                        formatDuration(job.lagSeconds)
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      ) : (
        <CardContent className="pb-4">
          <Text size="sm" tone="secondary">
            {isError ? 'Could not load analytics status.' : 'No analytics activity yet.'}
          </Text>
        </CardContent>
      )}
    </Card>
  );
}

export default function Overview({
  email,
  emailId,
  postId,
  timezone,
  batches,
  failures,
  onOpenTab,
}: {
  email: Email;
  emailId: string;
  postId: string;
  timezone: string;
  batches: EmailDebugBatch[] | null;
  failures: EmailRecipientFailure[] | null;
  onOpenTab: (tab: DebugTab) => void;
}) {
  const sent = email.email_count ?? 0;
  const failed = email.failed_count ?? 0;
  const share = (count: number) => (sent > 0 ? formatPercentage(count / sent) : null);
  const view = (tab: DebugTab, label: string) => (
    <Button size="sm" variant="ghost" onClick={() => onOpenTab(tab)}>
      {label}
    </Button>
  );

  const checks: Check[] = [
    batchesCheck(email, batches ?? [], postId, view('batches', 'View batches')),
    ...(failures ? [failuresCheck(failures, sent, view('failures', 'View failures'))] : []),
    settingCheck('opens', 'Open tracking', email.track_opens),
    settingCheck('clicks', 'Click tracking', email.track_clicks),
    settingCheck('feedback', 'Member feedback', email.feedback_enabled),
  ];

  const recipients = (
    <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">
      {email.recipient_filter || 'all'}
    </code>
  );

  return (
    <Stack gap="xl">
      <Card>
        <CardContent className={cn('grid grid-cols-2 p-0 sm:grid-cols-4', STACKED_GRID)}>
          <Metric color="var(--chart-purple)" label="Sent" value={sent} />
          <Metric
            color="var(--chart-green)"
            label="Delivered"
            share={share(email.delivered_count ?? 0)}
            value={email.delivered_count ?? 0}
          />
          <Metric
            color="var(--chart-blue)"
            label="Opened"
            share={email.track_opens ? share(email.opened_count ?? 0) : 'Not tracked'}
            value={email.opened_count ?? 0}
          />
          <Metric
            color="var(--chart-rose)"
            label="Failed"
            share={failed ? share(failed) : null}
            value={failed}
          />
        </CardContent>
        <CardContent className="grid grid-cols-2 gap-4 border-t px-6 py-4 sm:grid-cols-4">
          <Detail label="Status">{statusLabel(email.status)}</Detail>
          <Detail label="Recipients">{recipients}</Detail>
          <Detail label="Created">
            <DateTime timezone={timezone} value={email.created_at} />
          </Detail>
          <Detail label="Submitted">
            <DateTime timezone={timezone} value={email.submitted_at} />
          </Detail>
        </CardContent>
      </Card>
      <div className="divide-y rounded-lg border">
        {checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </div>
      <AnalyticsSummary emailId={emailId} onView={() => onOpenTab('analytics')} />
    </Stack>
  );
}
