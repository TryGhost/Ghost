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
import { Box, Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useAutomationRuns } from '@/automations/hooks/use-automation-runs';
import { useInfiniteVirtualScroll } from '@/shared/virtual-list';
import { mapAutomationRun } from '@/automations/utils/automation-runs';
import type { RunSortDirection } from '@/automations/types';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const ROW_HEIGHT = 72;
const INITIAL_SKELETON_ROWS = 10;
// Match the prototype: reveal just before the padded summary boundary reaches the top.
const STICKY_BOUNDARY_OFFSET = 12;

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

const RunRow = forwardRef<
  HTMLTableRowElement,
  {
    run: AutomationRun;
    'data-index': number;
    selectedRunId: string | null;
    onSelectRun: (id: string, memberName: string) => void;
    isSelectionDisabled: boolean;
  }
>(function RunRow({ run: data, selectedRunId, onSelectRun, isSelectionDisabled, ...props }, ref) {
  const run = mapAutomationRun(data);
  const { Icon, color } = statusIcons[run.status];
  return (
    <TableRow
      ref={ref}
      {...props}
      className={isSelectionDisabled ? undefined : 'cursor-pointer'}
      data-state={selectedRunId === run.id ? 'selected' : undefined}
      onClick={() => {
        if (!isSelectionDisabled) {
          onSelectRun(run.id, run.memberName);
        }
      }}
    >
      <TableCell className="h-[72px] p-4">
        <Stack className="min-w-0" gap="none">
          <button
            aria-label={`View run history for ${run.memberName}, started ${run.enteredDescription}`}
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
});

export const RunList: React.FC<{
  automationId: string;
  search?: string;
  enabled?: boolean;
  updating?: boolean;
  queryScope: string;
  dateRange: PerformanceDateRange;
  status: AutomationRunStatusFilter | null;
  selectedRunId: string | null;
  onSelectRun: (id: string, memberName: string) => void;
  isSelectionDisabled: boolean;
  direction: RunSortDirection;
  onDirectionChange: (direction: RunSortDirection) => void;
  summary: React.ReactNode;
  stickySummary: React.ReactNode;
}> = ({
  automationId,
  summary,
  stickySummary,
  queryScope,
  status,
  dateRange,
  direction,
  onDirectionChange,
  selectedRunId,
  onSelectRun,
  isSelectionDisabled,
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

  const SortIcon = direction === 'asc' ? LucideIcon.ArrowUp : LucideIcon.ArrowDown;
  const scrollRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [summaryHidden, setSummaryHidden] = useState(false);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.inert = summaryHidden;
    }
  }, [summaryHidden]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const summaryElement = summaryRef.current;
    const header = headerRef.current;
    const bar = stickyBarRef.current;
    const list = listRef.current;
    if (!scroller || !summaryElement || !header || !bar || !list) {
      return;
    }
    const measure = () => {
      const barHeight = bar.getBoundingClientRect().height;
      // The header follows the bar through each animation frame. Measure its natural
      // height, not its sticky position, when locating the virtualized rows.
      scroller.style.setProperty('--sticky-status-height', `${barHeight}px`);
      setScrollMargin(summaryElement.offsetHeight + barHeight + header.offsetHeight);
      // Keep a viewport of space below the summary, even with only a few runs.
      // Otherwise shrinking the bar could clamp scrolling across the sticky boundary.
      list.style.minHeight = `${Math.max(0, scroller.clientHeight - barHeight)}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(summaryElement);
    observer.observe(header);
    observer.observe(bar);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  const items = runs ?? [];
  const isScanning = scanning && !isError && !isNextPageError && !updating;
  // One extra row loads the next page without reserving space for unloaded history.
  const totalItems = items.length + (canLoadMore || isScanning ? 1 : 0);
  const { visibleItems, spaceBefore, spaceAfter } = useInfiniteVirtualScroll({
    items,
    totalItems,
    parentRef: scrollRef,
    hasNextPage: canLoadMore,
    isFetchingNextPage: isLoadingMore,
    fetchNextPage: loadMore,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
    getScrollElement: (element) => element,
  });
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setSummaryHidden(false);
  }, [queryScope, dateRange]);
  const showStickySummary = summaryHidden && !!stickySummary;

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto"
      data-testid="automation-runs-scroll"
      style={{ overflowAnchor: 'none' }}
      onScroll={(event) => {
        const height = summaryRef.current?.offsetHeight ?? 0;
        setSummaryHidden(
          height > 0 && event.currentTarget.scrollTop > height - STICKY_BOUNDARY_OFFSET,
        );
      }}
    >
      <Box
        ref={summaryRef}
        aria-hidden={summaryHidden || undefined}
        className={summary ? 'pb-4' : undefined}
      >
        {summary}
      </Box>
      <Box
        ref={stickyBarRef}
        className={cn(
          'sticky top-0 z-20 bg-surface-elevated',
          showStickySummary && 'border-b border-border-default pb-4',
        )}
      >
        <Grid
          ref={(element) => {
            if (element) {
              element.inert = !showStickySummary;
            }
          }}
          aria-hidden={!showStickySummary || undefined}
          className={cn(
            'transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
            showStickySummary ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
          gap="none"
        >
          <Box className="min-h-0 overflow-hidden">{stickySummary}</Box>
        </Grid>
      </Box>
      <Box
        ref={listRef}
        aria-busy={isLoading || isLoadingMore || isScanning}
        aria-label="Automation runs"
        role="region"
      >
        <Table aria-label="Automation runs" className="table-fixed">
          <TableHeader
            ref={headerRef}
            className="sticky z-10 bg-surface-elevated"
            style={{ top: 'var(--sticky-status-height, 0px)' }}
          >
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
                  Started <SortIcon aria-hidden="true" />
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
              return (
                <RunRow
                  key={item.id}
                  isSelectionDisabled={isSelectionDisabled}
                  run={item}
                  selectedRunId={selectedRunId}
                  onSelectRun={onSelectRun}
                  {...props}
                />
              );
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
        {(isLoadingMore || isScanning) && (
          <Text className="sr-only" role="status">
            Loading more runs
          </Text>
        )}
        {!isLoading && !isError && !scanning && !isNextPageError && runs?.length === 0 && (
          <Text className="px-4 py-6 text-center" role="status" size="sm" tone="secondary">
            No members match
          </Text>
        )}
        {isError && (
          <Stack className="px-4 py-6" gap="sm" role="alert">
            <Text size="sm" tone="secondary">
              Could not load runs
            </Text>
            <Button className="self-start" size="sm" variant="outline" onClick={retry}>
              Retry
            </Button>
          </Stack>
        )}
        {isNextPageError && (
          <Stack className="px-4 py-6" gap="sm" role="alert">
            <Text size="sm" tone="secondary">
              Could not load runs
            </Text>
            <Button className="self-start" size="sm" variant="outline" onClick={loadMore}>
              Retry
            </Button>
          </Stack>
        )}
      </Box>
    </div>
  );
};
