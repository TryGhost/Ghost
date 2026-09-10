import { useState, type ReactNode } from 'react';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import type { Email } from '@tryghost/admin-x-framework/api/content-types';
import {
  type EmailAnalyticsJob,
  useEmailAnalyticsStatus,
  useScheduleEmailAnalytics,
  useCancelEmailAnalytics,
} from '@tryghost/admin-x-framework/api/emails';
import {
  Button,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import {
  defaultRefetchRange,
  refetchRangeToUtc,
  formatDebugDate,
  formatIngestionLag,
  statusLabel,
} from './format';

function Details({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <Table>
      <TableBody>
        {rows.map(([label, value]) => (
          <TableRow key={label}>
            <TableCell className="w-64 text-muted-foreground">{label}</TableCell>
            <TableCell className="break-words whitespace-normal">{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AnalyticsJob({ title, job }: { title: string; job?: EmailAnalyticsJob }) {
  return (
    <Stack gap="sm">
      <h3 className="text-base font-semibold">{title}</h3>
      <Details
        rows={[
          ['Running', job?.running ? 'Yes' : 'No'],
          ['Last started', formatDebugDate(job?.lastStarted, true)],
          ['Fetching from', formatDebugDate(job?.lastBegin, true)],
          ['Last event time', formatDebugDate(job?.lastEventTimestamp, true)],
          ['Fetched through', formatDebugDate(job?.fetchedThrough, true)],
          ['Ingestion lag', formatIngestionLag(job?.lagSeconds)],
        ]}
      />
    </Stack>
  );
}

export default function Overview({ email, emailId }: { email: Email; emailId: string }) {
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
      await schedule.mutateAsync({
        id: emailId,
        ...range,
      });
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

  return (
    <Stack className="max-w-4xl" gap="2xl">
      <Details
        rows={[
          ['Status', statusLabel(email.status)],
          ['Recipient filter', email.recipient_filter || 'N/A'],
          ['Created at', formatDebugDate(email.created_at)],
          ['Submitted at', formatDebugDate(email.submitted_at)],
          ['Emails sent', formatNumber(email.email_count ?? 0)],
          ['Delivered', formatNumber(email.delivered_count ?? 0)],
          ['Opened', formatNumber(email.opened_count ?? 0)],
          ['Failed', formatNumber(email.failed_count ?? 0)],
          ['Track opens', email.track_opens ? 'Yes' : 'No'],
          ['Track clicks', email.track_clicks ? 'Yes' : 'No'],
          ['Member feedback', email.feedback_enabled ? 'Yes' : 'No'],
        ]}
      />
      {analytics.isLoading && <p role="status">Loading analytics status…</p>}
      {analytics.isError && (
        <p role="alert">Could not load analytics status. Retrying automatically.</p>
      )}
      {analytics.data && (
        <>
          <AnalyticsJob job={analytics.data.latest} title="Analytics Delivery/failures" />
          <AnalyticsJob job={analytics.data.latestOpened} title="Analytics Opens" />
          <AnalyticsJob job={analytics.data.missing} title="Analytics Missing" />
          {analytics.data.scheduled?.schedule ? (
            <Stack gap="md">
              <AnalyticsJob job={analytics.data.scheduled} title="Analytics Scheduled" />
              <Details
                rows={[
                  [
                    'Schedule',
                    `${formatDebugDate(analytics.data.scheduled.schedule.begin, true)} – ${formatDebugDate(analytics.data.scheduled.schedule.end, true)}`,
                  ],
                ]}
              />
              {!analytics.data.scheduled.canceled && (
                <Button
                  className="self-start"
                  disabled={pending}
                  variant="outline"
                  onClick={() => {
                    void cancelRefetch();
                  }}
                >
                  Cancel scheduled refetch
                </Button>
              )}
            </Stack>
          ) : customRange ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void scheduleRefetch(true);
              }}
            >
              <Stack gap="lg">
                <Stack gap="sm">
                  <Label htmlFor="custom-begin-date">Begin (UTC)</Label>
                  <Input
                    id="custom-begin-date"
                    type="datetime-local"
                    value={customRange.begin}
                    required
                    onChange={(event) =>
                      setCustomRange({ ...customRange, begin: event.target.value })
                    }
                  />
                </Stack>
                <Stack gap="sm">
                  <Label htmlFor="custom-end-date">End (UTC)</Label>
                  <Input
                    id="custom-end-date"
                    type="datetime-local"
                    value={customRange.end}
                    required
                    onChange={(event) =>
                      setCustomRange({ ...customRange, end: event.target.value })
                    }
                  />
                </Stack>
                <Inline gap="sm">
                  <Button disabled={pending} type="submit">
                    Schedule Custom Refetch
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
              </Stack>
            </form>
          ) : (
            <Inline gap="sm" wrap>
              <Button
                disabled={pending}
                variant="outline"
                onClick={() => {
                  void scheduleRefetch();
                }}
              >
                Refetch Analytics
              </Button>
              <Button disabled={pending} variant="outline" onClick={openCustomRange}>
                Custom Date Range
              </Button>
            </Inline>
          )}
        </>
      )}
      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}
    </Stack>
  );
}
