import React from 'react';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadButton,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useAutomationRuns } from '@/automations/hooks/use-automation-runs';
import type { RunSort } from '@/automations/types';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const statusIcons = {
  in_progress: { Icon: InProgressGlyph, color: 'text-state-info' },
  completed: { Icon: CompletedGlyph, color: 'text-state-success' },
  exited_early: { Icon: ExitedGlyph, color: 'text-muted-foreground' },
  unclassified: { Icon: LucideIcon.CircleHelp, color: 'text-muted-foreground' },
};

export const RunList: React.FC<{
  automationId: string;
  listRequestId: string;
  status: AutomationRunStatusFilter | null;
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  isSelectionDisabled: boolean;
  sort: RunSort;
  onSortChange: (sort: RunSort) => void;
}> = ({
  automationId,
  listRequestId,
  status,
  sort,
  onSortChange,
  selectedRunId,
  onSelectRun,
  isSelectionDisabled,
}) => {
  const { data, isLoading, isError, unavailable, unsupportedSort, retry } = useAutomationRuns(
    automationId,
    status,
    sort,
    listRequestId,
  );
  const SortIcon = sort.direction === 'asc' ? LucideIcon.ArrowUp : LucideIcon.ArrowDown;
  const changeSort = () =>
    onSortChange({
      key: 'created_at',
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    });
  return (
    <Stack aria-label="Automation runs" gap="sm" role="region">
      <Table aria-label="Automation runs" className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="px-4" scope="col">
              Member
            </TableHead>
            <TableHead
              aria-sort={sort.direction === 'asc' ? 'ascending' : 'descending'}
              className="w-28 px-4"
              scope="col"
            >
              <TableHeadButton className="normal-case" type="button" onClick={changeSort}>
                Entered <SortIcon aria-hidden="true" />
              </TableHeadButton>
            </TableHead>
            <TableHead className="w-20 px-4" scope="col">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 10 }, (_, index) => (
              <TableRow key={index} aria-hidden="true">
                <TableCell className="h-[72px] p-4">
                  <Stack gap="xs">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </Stack>
                </TableCell>
                <TableCell className="p-4">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="p-4">
                  <Skeleton className="mx-auto size-4 rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          {data?.map((run) => {
            const { Icon, color } = statusIcons[run.status];
            return (
              <TableRow
                key={run.id}
                className={isSelectionDisabled ? undefined : 'cursor-pointer'}
                data-state={selectedRunId === run.id ? 'selected' : undefined}
                onClick={() => {
                  if (!isSelectionDisabled) {
                    onSelectRun(run.id);
                  }
                }}
              >
                <TableCell className="h-[72px] p-4">
                  <Stack className="min-w-0" gap="none">
                    <button
                      aria-label={`View run history for ${run.memberName}, entered ${run.enteredDescription}`}
                      aria-pressed={selectedRunId === run.id}
                      className="truncate text-left font-medium outline-offset-4 focus-visible:outline-2 focus-visible:outline-focus-ring"
                      disabled={isSelectionDisabled}
                      title={run.memberName}
                      type="button"
                    >
                      {run.memberName}
                    </button>
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
      {isLoading && (
        <Text className="sr-only" role="status">
          Loading automation runs
        </Text>
      )}
      {data?.length === 0 && (
        <Text className="px-4 py-6 text-center" role="status" size="sm" tone="secondary">
          {status ? 'No matching entries.' : 'No entries yet.'}
        </Text>
      )}
      {unavailable && (
        <Text className="px-4 py-6" role="status" size="sm" tone="secondary">
          The run list is unavailable on this version of Ghost.
        </Text>
      )}
      {unsupportedSort && (
        <Text className="px-4 py-6" role="status" size="sm" tone="secondary">
          Sorting is unavailable on this version of Ghost.
        </Text>
      )}
      {isError && (
        <Stack className="px-4 py-6" gap="sm" role="alert">
          <Text size="sm" tone="secondary">
            Could not load automation runs.
          </Text>
          <Button className="self-start" size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
