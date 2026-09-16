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
import {
  createPerformanceDateRange,
  PERFORMANCE_RANGES,
} from '@/automations/utils/performance-date-range';

export const PerformanceSidebar: React.FC<{
  automationId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  isRunSelectionDisabled: boolean;
}> = ({
  automationId,
  isOpen,
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
  const [collapsed, setCollapsed] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [searchOpen]);
  const rangeLabel = PERFORMANCE_RANGES.find((range) => range.value === dateRange.value)!.label;
  const panelId = useId();
  const headingId = useId();
  const requestId = `${panelId}:${requestRevision}`;
  const listRequestId = `${requestId}:${listRevision}`;
  const updating = input.trim() !== search;
  const enabled = hasOpened && isOpen && !updating;
  const counts = useAutomationStatusStats(automationId, requestId, search, enabled);
  const commit = (value: string) => {
    const normalized = value.trim();
    if (normalized === search) {
      return;
    }
    setSearch(normalized);
    setRequestRevision((revision) => revision + 1);
    scrollRef.current?.scrollTo({ top: 0 });
    setCollapsed(false);
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
    const focusedCard = collapsed ? document.activeElement?.getAttribute('aria-label') : null;
    setStatus(status === selected ? null : selected);
    // Searching counts all statuses once. A card changes only its list.
    if (search) {
      setListRevision((revision) => revision + 1);
    } else {
      setRequestRevision((revision) => revision + 1);
    }
    setCollapsed(false);
    if (focusedCard) {
      requestAnimationFrame(() => {
        const card = Array.from(summaryRef.current?.querySelectorAll('button') ?? []).find(
          (button) => button.getAttribute('aria-label') === focusedCard,
        );
        card?.focus({ preventScroll: true });
      });
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
          isOpen ? 'w-[min(480px,calc(100cqw-6rem))]' : 'w-0',
        )}
        id={panelId}
      >
        <Stack
          className="h-full w-[min(480px,calc(100cqw-6rem))] overflow-hidden border-r border-border-default"
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
              {!input.trim() && (
                <PerformanceDateFilter
                  value={dateRange.value}
                  onChange={(value) => {
                    if (value !== dateRange.value) {
                      setDateRange(createPerformanceDateRange(value));
                    }
                  }}
                />
              )}
            </Inline>
            {collapsed && !updating && (
              <StatusCounts
                counts={counts}
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
              onScroll={() => {
                setCollapsed(
                  !!summaryRef.current &&
                    (scrollRef.current?.scrollTop ?? 0) > summaryRef.current.offsetHeight,
                );
              }}
            >
              <Stack gap="md">
                {/* Keep the entry query mounted so clearing search preserves its cached range. */}
                <Stack
                  ref={(summary) => {
                    summaryRef.current = summary;
                    if (summary) {
                      summary.inert = collapsed || updating;
                    }
                  }}
                  aria-hidden={collapsed || updating || undefined}
                  gap="md"
                >
                  <Box className={input.trim() ? 'hidden' : undefined}>
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
                        isHidden={!!input.trim()}
                      />
                    </Stack>
                  </Box>
                  <Box className={updating ? 'hidden' : undefined}>
                    <StatusCounts
                      counts={counts}
                      selectedStatus={status}
                      onStatusChange={changeStatus}
                    />
                  </Box>
                </Stack>
                {updating && (
                  <Text role="status" size="sm" tone="secondary">
                    Updating member search…
                  </Text>
                )}
                <Box className={updating ? 'hidden' : undefined}>
                  <RunList
                    automationId={automationId}
                    enabled={enabled}
                    isSelectionDisabled={isRunSelectionDisabled}
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
                      setCollapsed(false);
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
