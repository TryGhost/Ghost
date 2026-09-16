import React, { useId, useRef, useState, useLayoutEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import { Button, Input } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { TotalEntries } from './total-entries';
import { StatusCounts } from './status-counts';
import { RunList } from './run-list';
import { PerformanceDateFilter } from './performance-date-filter';
import type { RunSort } from '@/automations/types';
import { useAutomationStatusStats } from '@/automations/hooks/use-automation-status-stats';
import { usePerformanceScroll } from '@/automations/hooks/use-performance-scroll';
import {
  createPerformanceDateRange,
  PERFORMANCE_RANGES,
} from '@/automations/utils/performance-date-range';

export const PerformanceSidebar: React.FC<{
  automationId: string;
  isOpen: boolean;
  isHistoryOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRunId: string | null;
  onSelectRun: (id: string, memberName: string) => void;
  isRunSelectionDisabled: boolean;
}> = ({
  automationId,
  isOpen,
  isHistoryOpen,
  onOpenChange,
  selectedRunId,
  onSelectRun,
  isRunSelectionDisabled,
}) => {
  const [hasOpened, setHasOpened] = useState(false);
  const [status, setStatus] = useState<AutomationRunStatusFilter | null>(null);
  const [requestRevision, setRequestRevision] = useState(0);
  const [sort, setSort] = useState<RunSort>({ key: 'created_at', direction: 'desc' });
  const [listRevision, setListRevision] = useState(0);
  const [dateRange, setDateRange] = useState(() => createPerformanceDateRange('all'));
  const [searchOpen, setSearchOpen] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const searchButton = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [searchOpen]);
  const rangeLabel = PERFORMANCE_RANGES.find((range) => range.value === dateRange.value)!.label;
  const panelId = useId();
  const headingId = useId();
  const requestId = `${panelId}:${requestRevision}:${JSON.stringify(dateRange.searchParams)}`;
  const listRequestId = `${requestId}:${listRevision}`;
  const { scrollRef, summaryRef, listRef, collapsed, onScroll, showSummary } = usePerformanceScroll(
    hasOpened,
    listRequestId,
  );
  const updating = input.trim() !== search;
  const enabled = hasOpened && isOpen && !updating;
  const counts = useAutomationStatusStats(automationId, requestId, search, enabled, dateRange);
  const commit = (value: string) => {
    const normalized = value.trim();
    if (normalized === search) {
      return;
    }
    setSearch(normalized);
    setRequestRevision((revision) => revision + 1);
    showSummary();
  };
  const debounce = useDebouncedCallback(commit, 300);
  const clearSearch = () => {
    debounce.cancel();
    setInput('');
    if (search) {
      commit('');
    }
    inputRef.current?.focus({ preventScroll: true });
  };
  const closeSearch = () => {
    clearSearch();
    setSearchOpen(false);
    requestAnimationFrame(() => searchButton.current?.focus({ preventScroll: true }));
  };
  const changeStatus = (selected: AutomationRunStatusFilter) => {
    setStatus(status === selected ? null : selected);
    // Searching counts all statuses once. A card changes only its list.
    if (search) {
      setListRevision((revision) => revision + 1);
    } else {
      setRequestRevision((revision) => revision + 1);
    }
  };
  return (
    <>
      <Button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Hide performance' : 'Show performance'}
        className="absolute top-4 left-4 z-20"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => {
          setHasOpened(true);
          onOpenChange(!isOpen);
        }}
      >
        <LucideIcon.PanelLeft strokeWidth={2} />
      </Button>
      <aside
        ref={(panel) => {
          if (panel) {
            panel.inert = !isOpen;
          }
        }}
        aria-hidden={!isOpen}
        aria-labelledby={headingId}
        className={cn(
          'shrink-0 overflow-hidden bg-surface-elevated transition-[width] duration-150 ease-out motion-reduce:transition-none',
          isHistoryOpen
            ? '@max-[640px]/automation:absolute @max-[640px]/automation:inset-y-0 @max-[640px]/automation:left-0 @max-[640px]/automation:z-10'
            : '@max-[960px]/automation:absolute @max-[960px]/automation:inset-y-0 @max-[960px]/automation:left-0 @max-[960px]/automation:z-10',
          isOpen
            ? cn(
                'w-[480px]',
                isHistoryOpen ? '@max-[640px]/automation:w-full' : '@max-[960px]/automation:w-full',
              )
            : 'w-0',
        )}
        id={panelId}
      >
        <Stack
          className={cn(
            'h-full w-[480px] overflow-hidden border-r border-border-default',
            isHistoryOpen
              ? '@max-[640px]/automation:w-[100cqw]'
              : '@max-[960px]/automation:w-[100cqw]',
          )}
          gap="none"
        >
          <Stack className="shrink-0 px-6 pt-4 pb-3" gap="md">
            <Inline className="h-9 pl-10" gap="sm" justify="between">
              <Text
                as="h2"
                className={searchOpen ? 'sr-only' : undefined}
                id={headingId}
                size="md"
                weight="semibold"
              >
                Performance
              </Text>
              {searchOpen ? (
                <>
                  <Box className="relative min-w-0 flex-1">
                    <LucideIcon.Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      ref={inputRef}
                      aria-label="Search members"
                      className="pr-8 pl-9"
                      placeholder="Search members…"
                      value={input}
                      onChange={(event) => {
                        const value = event.target.value;
                        setInput(value);
                        if (!value.trim()) {
                          debounce.cancel();
                          if (search) {
                            commit('');
                          }
                        } else {
                          debounce(value);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          closeSearch();
                        }
                        if (event.key === 'Enter') {
                          debounce.flush();
                        }
                      }}
                    />
                    {input && (
                      <Button
                        aria-label="Clear member search"
                        className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                        size="icon"
                        variant="ghost"
                        onClick={clearSearch}
                      >
                        <LucideIcon.X />
                      </Button>
                    )}
                  </Box>
                  <Button
                    aria-label="Close member search"
                    size="icon"
                    variant="ghost"
                    onClick={closeSearch}
                  >
                    <LucideIcon.X />
                  </Button>
                </>
              ) : (
                <Button
                  ref={searchButton}
                  aria-label="Search members"
                  className="ml-auto"
                  size="icon"
                  variant="ghost"
                  onClick={() => setSearchOpen(true)}
                >
                  <LucideIcon.Search />
                </Button>
              )}
              <PerformanceDateFilter
                value={dateRange.value}
                onChange={(value) => {
                  if (value !== dateRange.value) {
                    setDateRange(createPerformanceDateRange(value));
                  }
                }}
              />
            </Inline>
            {collapsed && (
              <StatusCounts
                counts={counts}
                isUpdating={updating}
                selectedStatus={status}
                compact
                onStatusChange={changeStatus}
              />
            )}
          </Stack>
          {hasOpened && (
            <Box
              ref={scrollRef}
              aria-label="Performance details"
              className="min-h-0 flex-1 overflow-y-auto px-6 pb-4"
              style={{ overflowAnchor: 'none' }}
              onScroll={onScroll}
            >
              <Stack gap="md">
                {/* Keep the entry query mounted so clearing search preserves its cached range. */}
                <Stack
                  ref={(summary) => {
                    summaryRef.current = summary;
                    if (summary) {
                      summary.inert = collapsed;
                    }
                  }}
                  aria-hidden={collapsed || undefined}
                  gap="md"
                >
                  <Stack gap="md">
                    {dateRange.value !== 'all' && (
                      <Button
                        aria-label="Clear date filter"
                        className="self-start"
                        type="button"
                        variant="outline"
                        onClick={() => setDateRange(createPerformanceDateRange('all'))}
                      >
                        {rangeLabel}
                        <LucideIcon.X strokeWidth={2} />
                      </Button>
                    )}
                    <TotalEntries
                      automationId={automationId}
                      dateRange={dateRange}
                      isUpdating={updating}
                      searchResult={search ? counts : undefined}
                    />
                  </Stack>
                  <StatusCounts
                    counts={counts}
                    isUpdating={updating}
                    selectedStatus={status}
                    onStatusChange={changeStatus}
                  />
                </Stack>
                <Box ref={listRef}>
                  <RunList
                    automationId={automationId}
                    dateRange={dateRange}
                    enabled={enabled}
                    isSelectionDisabled={isRunSelectionDisabled}
                    isUpdating={updating}
                    listRequestId={listRequestId}
                    scrollRef={scrollRef}
                    search={search}
                    selectedRunId={selectedRunId}
                    sort={sort}
                    status={status}
                    onSelectRun={onSelectRun}
                    onSortChange={(next) => {
                      setSort(next);
                      setListRevision((revision) => revision + 1);
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          )}
        </Stack>
      </aside>
    </>
  );
};
