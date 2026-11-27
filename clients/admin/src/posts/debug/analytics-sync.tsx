import { useState } from 'react';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import type { Email } from '@tryghost/admin-x-framework/api/content-types';
import {
  type EmailAnalyticsJob,
  useCancelEmailAnalytics,
  useEmailAnalyticsStatus,
  useScheduleEmailAnalytics,
} from '@tryghost/admin-x-framework/api/emails';
import {
  Button,
  Indicator,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import {
  defaultRefetchRange,
  formatDebugDate,
  formatDuration,
  formatSyncTime,
  refetchRangeToUtc,
} from './format';
import { JOBS, hasJobActivity } from './jobs';

function Time({ value, title }: { value?: string | null; title?: string }) {
  const formatted = formatSyncTime(value);
  if (!formatted) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  return (
    <Stack
      className="whitespace-nowrap tabular-nums"
      gap="none"
      title={title ?? formatDebugDate(value, true)}
    >
      <span>{formatted.date}</span>
      <span className="text-muted-foreground">{formatted.time}</span>
    </Stack>
  );
}

function JobRow({
  label,
  detail,
  job,
  state,
}: {
  label: string;
  detail?: string;
  job?: EmailAnalyticsJob;
  state?: string;
}) {
  const started = formatSyncTime(job?.lastStarted);
  return (
    <TableRow>
      <TableCell>
        <Stack gap="none">
          <span className="font-medium whitespace-nowrap">{label}</span>
          {detail && (
            <Text as="span" className="whitespace-nowrap tabular-nums" size="sm" tone="secondary">
              {detail}
            </Text>
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <Stack gap="none">
          <Inline align="center" className="whitespace-nowrap" gap="sm">
            <Indicator
              size="sm"
              state={job?.running ? 'active' : 'idle'}
              variant={job?.running ? 'success' : 'neutral'}
            />
            {state ?? (job?.running ? 'Running' : 'Idle')}
          </Inline>
          {started && (
            <Text
              as="span"
              className="whitespace-nowrap tabular-nums"
              size="sm"
              title={formatDebugDate(job?.lastStarted, true)}
              tone="secondary"
            >
              Started {started.date}, {started.time}
            </Text>
          )}
        </Stack>
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">
        {formatDuration(job?.lagSeconds)}
      </TableCell>
      <TableCell>
        <Time
          title={`Fetching from ${formatDebugDate(job?.lastBegin, true)}\nFetched through ${formatDebugDate(job?.fetchedThrough, true)}`}
          value={job?.fetchedThrough}
        />
      </TableCell>
      <TableCell>
        <Time value={job?.lastEventTimestamp} />
      </TableCell>
    </TableRow>
  );
}

export default function AnalyticsSync({ email, emailId }: { email: Email; emailId: string }) {
  const analytics = useEmailAnalyticsStatus(emailId, {
    refetchInterval: 5000,
    retry: false,
    defaultErrorHandler: false,
  });
  const schedule = useScheduleEmailAnalytics();
  const cancel = useCancelEmailAnalytics();
  const [customRange, setCustomRange] = useState<{ begin: string; end: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = schedule.isPending || cancel.isPending;
  const status = analytics.data;
  const scheduled = status?.scheduled;

  function openCustomRange() {
    setCustomRange(defaultRefetchRange(email.created_at));
    setError(null);
  }

  async function scheduleRefetch(custom = false) {
    setError(null);
    let range = {};
    if (custom && customRange) {
      try {
        range = refetchRangeToUtc(customRange);
      } catch {
        setError('Choose a begin date before the end date.');
        return;
      }
    }
    try {
      await schedule.mutateAsync({ id: emailId, ...range });
      setCustomRange(null);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not schedule analytics refetch.'));
    }
  }

  async function cancelRefetch() {
    setError(null);
    try {
      await cancel.mutateAsync();
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not cancel analytics refetch.'));
    }
  }

  let actions = null;
  if (analytics.isLoading) {
    // Wait for the status so a scheduled refetch doesn't flash the refetch buttons.
  } else if (scheduled?.schedule) {
    actions = !scheduled.canceled && (
      <Button
        disabled={pending}
        size="sm"
        variant="outline"
        onClick={() => {
          void cancelRefetch();
        }}
      >
        Cancel scheduled refetch
      </Button>
    );
  } else if (!customRange) {
    actions = (
      <Inline gap="sm" wrap>
        <Button
          disabled={pending}
          size="sm"
          variant="outline"
          onClick={() => {
            void scheduleRefetch();
          }}
        >
          Refetch analytics
        </Button>
        <Button disabled={pending} size="sm" variant="outline" onClick={openCustomRange}>
          Custom date range
        </Button>
      </Inline>
    );
  }

  const hasActivity = hasJobActivity(status);

  return (
    <Stack gap="md">
      <Inline align="center" gap="md" justify="between" wrap>
        <Text size="sm" tone="secondary">
          All times UTC. Hover a time for full detail.
        </Text>
        {actions}
      </Inline>
      {customRange && !scheduled?.schedule && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void scheduleRefetch(true);
          }}
        >
          <Inline align="end" gap="md" wrap>
            <Stack gap="sm">
              <Label htmlFor="custom-begin-date">Begin (UTC)</Label>
              <Input
                id="custom-begin-date"
                type="datetime-local"
                value={customRange.begin}
                required
                onChange={(event) => setCustomRange({ ...customRange, begin: event.target.value })}
              />
            </Stack>
            <Stack gap="sm">
              <Label htmlFor="custom-end-date">End (UTC)</Label>
              <Input
                id="custom-end-date"
                type="datetime-local"
                value={customRange.end}
                required
                onChange={(event) => setCustomRange({ ...customRange, end: event.target.value })}
              />
            </Stack>
            <Inline gap="sm">
              <Button disabled={pending} type="submit">
                Schedule refetch
              </Button>
              <Button
                disabled={pending}
                type="button"
                variant="outline"
                onClick={() => {
                  setCustomRange(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </Inline>
          </Inline>
        </form>
      )}
      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}
      {analytics.isLoading && <p role="status">Loading analytics status…</p>}
      {analytics.isError && (
        <p role="alert">Could not load analytics status. Retrying automatically.</p>
      )}
      {status && !hasActivity && <p className="text-muted-foreground">No fetches recorded yet.</p>}
      {status && hasActivity && (
        <Table>
          <TableHeader>
            <TableRow>
              {['Job', 'State', 'Lag', 'Fetched through', 'Last event'].map((label) => (
                <TableHead key={label} className="whitespace-nowrap">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {JOBS.map(([key, label]) => (
              <JobRow key={key} job={status[key]} label={label} />
            ))}
            {scheduled?.schedule && (
              <JobRow
                detail={`${formatDebugDate(scheduled.schedule.begin)} – ${formatDebugDate(scheduled.schedule.end)}`}
                job={scheduled}
                label="Scheduled refetch"
                state={scheduled.canceled ? 'Canceled' : undefined}
              />
            )}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
