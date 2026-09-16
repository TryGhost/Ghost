import React, { forwardRef, useLayoutEffect, useRef, useState, type RefObject } from 'react';
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
import { useInfiniteVirtualScroll } from '@/shared/virtual-list';
import { mapAutomationRun } from '@/automations/utils/automation-runs';
import type { RunSort } from '@/automations/types';
import { CompletedGlyph, ExitedGlyph, InProgressGlyph } from './run-status-icons';

const ROW_HEIGHT = 72;

const statusIcons = {
  in_progress: { Icon: InProgressGlyph, color: 'text-state-info' },
  completed: { Icon: CompletedGlyph, color: 'text-state-success' },
  exited_early: { Icon: ExitedGlyph, color: 'text-muted-foreground' },
  unclassified: { Icon: LucideIcon.CircleHelp, color: 'text-muted-foreground' },
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

export const RunList: React.FC<{
  automationId: string;
  listRequestId: string;
  search: string;
  enabled: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  status: AutomationRunStatusFilter | null;
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  isSelectionDisabled: boolean;
  sort: RunSort;
  onSortChange: (sort: RunSort) => void;
}> = ({
  automationId,
  listRequestId,
  search,
  enabled,
  scrollRef,
  status,
  sort,
  onSortChange,
  selectedRunId,
  onSelectRun,
  isSelectionDisabled,
}) => {
  const {
    runs,
    isLoading,
    isError,
    unavailable,
    unsupportedSort,
    unsupportedSearch,
    scanning,
    paused,
    continueSearch,
    retry,
    canLoadMore,
    isLoadingMore,
    isMoreError,
    loadMore,
  } = useAutomationRuns(automationId, status, sort, listRequestId, search, enabled);
  const SortIcon = sort.direction === 'asc' ? LucideIcon.ArrowUp : LucideIcon.ArrowDown;
  const changeSort = () =>
    onSortChange({
      key: 'created_at',
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    });
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const body = bodyRef.current;
    if (!scroll || !body) {
      return;
    }
    const measure = () =>
      setScrollMargin(
        body.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop,
      );
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(scroll);
    if (scroll.firstElementChild) {
      observer.observe(scroll.firstElementChild);
    }
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [scrollRef, search]);
  const items = runs ?? [];
  // Expose only the next loading row: a scrollbar jump must not fetch the entire history.
  const totalItems = items.length + (canLoadMore ? 1 : 0);
  const { visibleItems, spaceBefore, spaceAfter } = useInfiniteVirtualScroll({
    items,
    totalItems,
    scrollMargin,
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
  }, [listRequestId]);
  return (
    <Stack aria-label="Automation runs" className="shrink-0" gap="sm" role="region">
      <div>
        <Table aria-label="Automation runs" className="table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-surface-elevated">
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
          <TableBody ref={bodyRef}>
            {isLoading &&
              Array.from({ length: 10 }, (_, index) => (
                <PlaceholderRow key={index} data-index={index} />
              ))}
            <SpacerRow height={spaceBefore} />
            {visibleItems.map(({ key, virtualItem, item, props }) => {
              if (virtualItem.index > items.length - 1) {
                return <PlaceholderRow key={key} {...props} />;
              }
              const run = mapAutomationRun(item);
              const { Icon, color } = statusIcons[run.status];
              return (
                <TableRow
                  key={run.id}
                  {...props}
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
            <SpacerRow height={spaceAfter} />
          </TableBody>
        </Table>
        {isLoading && (
          <Text className="sr-only" role="status">
            Loading automation runs
          </Text>
        )}
        {isLoadingMore && (
          <Text className="sr-only" role="status">
            Loading more entries
          </Text>
        )}
        {runs?.length === 0 && !scanning && (
          <Text className="px-4 py-6 text-center" role="status" size="sm" tone="secondary">
            {status || search ? 'No matching entries.' : 'No entries yet.'}
          </Text>
        )}
        {scanning && !isMoreError && (
          <Stack className="px-4 py-3" gap="sm">
            <Text role="status" size="sm" tone="secondary">
              {paused ? 'Search paused. Continue to find more entries.' : 'Searching more entries…'}
            </Text>
            {paused && (
              <Button className="self-start" size="sm" variant="outline" onClick={continueSearch}>
                Continue search
              </Button>
            )}
          </Stack>
        )}
        {unsupportedSearch && (
          <Text className="px-4 py-6" role="status" size="sm" tone="secondary">
            Member search is unavailable on this version of Ghost.
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
        {isMoreError && (
          <Stack className="px-4 py-6" gap="sm" role="alert">
            <Text size="sm" tone="secondary">
              Could not load more runs.
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
