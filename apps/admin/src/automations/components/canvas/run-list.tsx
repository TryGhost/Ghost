import React, { useEffect, useState } from 'react';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useAutomationRuns } from '@/automations/hooks/use-automation-runs';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const statusIcons = {
  in_progress: { Icon: InProgressGlyph, color: 'text-state-info' },
  completed: { Icon: CompletedGlyph, color: 'text-state-success' },
  exited_early: { Icon: ExitedGlyph, color: 'text-muted-foreground' },
};

export const RunList: React.FC<{
  automationId: string;
  queryScope: string;
  dateRange: PerformanceDateRange;
  status: AutomationRunStatusFilter | null;
}> = ({ automationId, queryScope, status, dateRange }) => {
  const { data, isLoading, isError, retry } = useAutomationRuns(
    automationId,
    status,
    queryScope,
    dateRange,
  );
  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }
    const timeout = window.setTimeout(() => setShowLoading(true), 200);
    return () => window.clearTimeout(timeout);
  }, [isLoading]);
  const loadingVisible = isLoading && showLoading;
  let emptyMessage = 'No entries yet';
  if (status) {
    emptyMessage = 'No matching entries';
  } else if (dateRange.value !== 'all') {
    emptyMessage = 'No entries in this period';
  }

  return (
    <Stack aria-busy={isLoading} aria-label="Automation runs" gap="sm" role="region">
      <Table aria-label="Automation runs" className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="px-4" scope="col">
              <Inline gap="xs">
                Member
                {loadingVisible && !!data?.length && (
                  <LucideIcon.LoaderCircle
                    aria-hidden="true"
                    className="size-3 animate-spin motion-reduce:animate-none"
                  />
                )}
              </Inline>
            </TableHead>
            <TableHead aria-sort="descending" className="w-28 px-4" scope="col">
              <Inline gap="xs">
                Entered <LucideIcon.ArrowDown aria-hidden="true" className="size-4" />
              </Inline>
            </TableHead>
            <TableHead className="w-20 px-4" scope="col">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(loadingVisible && !!data?.length && 'opacity-50')}>
          {isLoading && !data?.length && (
            <TableRow>
              <TableCell className="h-[72px] px-4 text-center" colSpan={3}>
                {loadingVisible && (
                  <Text role="status" size="sm" tone="secondary">
                    Loading automation runs
                  </Text>
                )}
              </TableCell>
            </TableRow>
          )}
          {data?.map((run) => {
            const { Icon, color } = statusIcons[run.status];
            return (
              <TableRow key={run.id}>
                <TableCell className="h-[72px] p-4">
                  <Stack className="min-w-0" gap="none">
                    <span className="truncate font-medium" title={run.memberName}>
                      {run.memberName}
                    </span>
                    {run.memberEmail && (
                      <span className="truncate text-muted-foreground" title={run.memberEmail}>
                        {run.memberEmail}
                      </span>
                    )}
                  </Stack>
                </TableCell>
                <TableCell className="p-4">
                  <time
                    className="block truncate"
                    dateTime={run.enteredAt}
                    title={run.enteredDescription}
                  >
                    {run.enteredLabel}
                  </time>
                </TableCell>
                <TableCell className="p-4 text-center">
                  <Inline
                    aria-label={run.statusLabel}
                    as="span"
                    justify="center"
                    role="img"
                    title={run.statusLabel}
                  >
                    <span className="relative">
                      <Icon aria-hidden="true" className={`size-4 ${color}`} />
                      {run.failed && (
                        <span
                          aria-hidden="true"
                          className="absolute -top-1 -right-1 size-1.5 rounded-full bg-state-danger"
                        />
                      )}
                    </span>
                  </Inline>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {loadingVisible && !!data?.length && (
        <Text className="sr-only" role="status">
          Updating automation runs
        </Text>
      )}
      {!isLoading && !isError && data?.length === 0 && (
        <Text className="px-4 py-6 text-center" role="status" size="sm" tone="secondary">
          {emptyMessage}
        </Text>
      )}
      {isError && (
        <Stack className="px-4 py-6" gap="sm" role="alert">
          <Text size="sm" tone="secondary">
            Could not load automation runs
          </Text>
          <Button className="self-start" size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
