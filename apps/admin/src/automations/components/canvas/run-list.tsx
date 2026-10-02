import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  AutomationRun,
  AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
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
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useAutomationRuns } from '@/automations/hooks/use-automation-runs';
import { useInfiniteVirtualScroll } from '@/shared/virtual-list';
import { mapAutomationRun } from '@/automations/utils/automation-runs';
import type { RunSortDirection } from '@/automations/types';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const ROW_HEIGHT = 72;
const INITIAL_SKELETON_ROWS = 10;

const statusIcons = {
  in_progress: { Icon: InProgressGlyph, color: 'text-state-info' },
  completed: { Icon: CompletedGlyph, color: 'text-state-success' },
  exited_early: { Icon: ExitedGlyph, color: 'text-muted-foreground' },
};

const SpacerRow: React.FC<{ height: number }> = ({ height }) => (
  <tr aria-hidden="true" style={{ height }}>
    <td colSpan={3} />
  </tr>
);

const PlaceholderRow = forwardRef<HTMLTableRowElement, { 'data-index': number }>(
  function PlaceholderRow(props, ref) {
    return (
      <TableRow ref={ref} aria-hidden="true" {...props}>
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
    );
  },
);

const RunRow = forwardRef<HTMLTableRowElement, { run: AutomationRun; 'data-index': number }>(
  function RunRow({ run: data, ...props }, ref) {
    const run = mapAutomationRun(data);
    const { Icon, color } = statusIcons[run.status];
    return (
      <TableRow ref={ref} {...props}>
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
          <time className="block truncate" dateTime={run.enteredAt} title={run.enteredDescription}>
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
  },
);

export const RunList: React.FC<{
  automationId: string;
  search?: string;
  enabled?: boolean;
  updating?: boolean;
  queryScope: string;
  dateRange: PerformanceDateRange;
  status: AutomationRunStatusFilter | null;
  direction: RunSortDirection;
  onDirectionChange: (direction: RunSortDirection) => void;
}> = ({
  automationId,
  queryScope,
  status,
  dateRange,
  direction,
  onDirectionChange,
  search = '',
  enabled = true,
  updating = false,
}) => {
  const {
    runs,
    isLoading,
    isError,
    retry,
    canLoadMore,
    isLoadingMore,
    isNextPageError,
    loadMore,
    scanning,
    paused,
    continueSearch,
  } = useAutomationRuns(
    automationId,
    status,
    direction,
    queryScope,
    dateRange,
    search,
    enabled,
    updating,
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
  if (search || status) {
    emptyMessage = 'No matching entries';
  } else if (dateRange.value !== 'all') {
    emptyMessage = 'No entries in this period';
  }

  const SortIcon = direction === 'asc' ? LucideIcon.ArrowUp : LucideIcon.ArrowDown;
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = runs ?? [];
  // One extra row loads the next page without reserving space for unloaded history.
  const totalItems = items.length + (canLoadMore ? 1 : 0);
  const { visibleItems, spaceBefore, spaceAfter } = useInfiniteVirtualScroll({
    items,
    totalItems,
    parentRef: scrollRef,
    hasNextPage: canLoadMore,
    isFetchingNextPage: isLoadingMore,
    fetchNextPage: loadMore,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    getScrollElement: (element) => element,
  });
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [queryScope, dateRange]);
  return (
    <Stack
      aria-busy={isLoading}
      aria-label="Automation runs"
      className="min-h-[216px] flex-1"
      gap="sm"
      role="region"
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
        data-testid="automation-runs-scroll"
      >
        <Table aria-label="Automation runs" className="table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-surface-elevated">
            <TableRow>
              <TableHead className="px-4" scope="col">
                <Inline gap="xs">
                  Member
                  {loadingVisible && !!runs?.length && (
                    <LucideIcon.LoaderCircle
                      aria-hidden="true"
                      className="size-3 animate-spin motion-reduce:animate-none"
                    />
                  )}
                </Inline>
              </TableHead>
              <TableHead
                aria-sort={direction === 'asc' ? 'ascending' : 'descending'}
                className="w-28 px-4"
                scope="col"
              >
                <TableHeadButton
                  className="normal-case"
                  type="button"
                  onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
                >
                  Entered <SortIcon aria-hidden="true" />
                </TableHeadButton>
              </TableHead>
              <TableHead className="w-20 px-4" scope="col">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(loadingVisible && !!runs?.length && 'opacity-50')}>
            {isLoading &&
              !runs?.length &&
              Array.from({ length: INITIAL_SKELETON_ROWS }, (_, index) => (
                <PlaceholderRow key={`loading-${index}`} data-index={index} />
              ))}
            <SpacerRow height={spaceBefore} />
            {visibleItems.map(({ key, virtualItem, item, props }) => {
              if (virtualItem.index > items.length - 1) {
                return <PlaceholderRow key={key} {...props} />;
              }
              return <RunRow key={item.id} run={item} {...props} />;
            })}
            <SpacerRow height={spaceAfter} />
          </TableBody>
        </Table>
        {loadingVisible && !runs?.length && (
          <Text className="sr-only" role="status">
            Loading automation runs
          </Text>
        )}
        {loadingVisible && !!runs?.length && (
          <Text className="sr-only" role="status">
            Updating automation runs
          </Text>
        )}
        {isLoadingMore && (
          <Text className="sr-only" role="status">
            Loading more entries
          </Text>
        )}
        {!isLoading && !isError && !scanning && !isNextPageError && runs?.length === 0 && (
          <Text className="px-4 py-6 text-center" role="status" size="sm" tone="secondary">
            {emptyMessage}
          </Text>
        )}
        {scanning && !isError && !isNextPageError && !updating && (
          <Stack className="px-4 py-3" gap="sm">
            <Text role="status" size="sm" tone="secondary">
              {paused ? 'Search paused. Continue to find more entries' : 'Searching more entries…'}
            </Text>
            {paused && (
              <Button className="self-start" size="sm" variant="outline" onClick={continueSearch}>
                Continue search
              </Button>
            )}
          </Stack>
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
        {isNextPageError && (
          <Stack className="px-4 py-6" gap="sm" role="alert">
            <Text size="sm" tone="secondary">
              Could not load more runs
            </Text>
            <Button className="self-start" size="sm" variant="outline" onClick={loadMore}>
              Retry
            </Button>
          </Stack>
        )}
      </div>
    </Stack>
  );
};
