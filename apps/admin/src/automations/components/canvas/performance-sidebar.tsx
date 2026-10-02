import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useAutomationPerformanceStats } from '@/automations/hooks/use-automation-performance-stats';
import React, { useId, useState } from 'react';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import { Button } from '@tryghost/shade/components';
import { Box, Grid, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { TotalEntries } from './total-entries';
import { StatusCounts } from './status-counts';
import type { RunSortDirection } from '@/automations/types';
import { RunList } from './run-list';
import { MemberSearch } from './member-search';
import { PerformanceDateFilter } from './performance-date-filter';
import {
  createPerformanceDateRange,
  PERFORMANCE_RANGES,
} from '@/automations/utils/performance-date-range';

const PerformanceContent: React.FC<{
  automationId: string;
  dateRange: PerformanceDateRange;
  onClearDate: () => void;
  queryScope: string;
  search: string;
  searchActive: boolean;
  updating: boolean;
  enabled: boolean;
  runQueryScope: string;
  direction: RunSortDirection;
  onDirectionChange: (direction: RunSortDirection) => void;
  selectedStatus: AutomationRunStatusFilter | null;
  onStatusChange: (status: AutomationRunStatusFilter) => void;
}> = ({
  automationId,
  search,
  searchActive,
  updating,
  enabled,
  dateRange,
  onClearDate,
  queryScope,
  runQueryScope,
  selectedStatus,
  onStatusChange,
  direction,
  onDirectionChange,
}) => {
  const { chart, counts, isLoading, isError, retry } = useAutomationPerformanceStats(
    automationId,
    dateRange,
    queryScope,
  );

  const rangeLabel = PERFORMANCE_RANGES.find((range) => range.value === dateRange.value)!.label;

  if (isError && !searchActive) {
    return (
      <Stack
        align="center"
        className="flex-1 py-8 text-center"
        gap="md"
        justify="center"
        role="alert"
      >
        <Text size="sm" tone="secondary">
          Could not load performance data
        </Text>
        <Button size="sm" variant="outline" onClick={retry}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <>
      <Grid
        ref={(summary) => {
          if (summary) {
            summary.inert = searchActive;
          }
        }}
        aria-hidden={searchActive || undefined}
        className={cn(
          'shrink-0 transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
          searchActive ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
        gap="none"
      >
        <Box className="min-h-0 overflow-hidden">
          {/* Keep spacing inside the collapse so the list slides all the way up. */}
          <Stack className="pb-3" gap="md">
            {dateRange.value !== 'all' && (
              <Button
                aria-label="Clear date filter"
                className="self-start"
                type="button"
                variant="outline"
                onClick={onClearDate}
              >
                {rangeLabel}
                <LucideIcon.X strokeWidth={2} />
              </Button>
            )}
            <TotalEntries chart={chart} isLoading={isLoading} />
            <StatusCounts
              data={counts}
              isLoading={isLoading}
              selectedStatus={selectedStatus}
              onStatusChange={onStatusChange}
            />
          </Stack>
        </Box>
      </Grid>
      <RunList
        key={`${automationId}:${JSON.stringify(dateRange.searchParams)}`}
        automationId={automationId}
        dateRange={dateRange}
        direction={direction}
        enabled={enabled}
        queryScope={runQueryScope}
        search={search}
        status={searchActive ? null : selectedStatus}
        updating={updating}
        onDirectionChange={onDirectionChange}
      />
    </>
  );
};

export const PerformanceSidebar: React.FC<{ automationId: string }> = ({ automationId }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const searchActive = !!input || !!search;
  const updating = input !== search;
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [status, setStatus] = useState<AutomationRunStatusFilter | null>(null);
  const [direction, setDirection] = useState<RunSortDirection>('desc');
  const [queryRevision, setQueryRevision] = useState(0);
  const [dateRange, setDateRange] = useState(() => createPerformanceDateRange('all'));
  const panelId = useId();
  const headingId = useId();
  // List selections refetch runs without invalidating the date-range summary.
  const runQueryScope = `${panelId}:${queryRevision}`;

  return (
    <>
      <Button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Hide performance' : 'Show performance'}
        className="absolute top-4 left-4 z-10"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => {
          setHasOpened(true);
          setIsOpen((open) => !open);
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
        {/* Keep content at its full width while the sidebar animates open or closed. */}
        <Stack
          className="h-full w-[min(480px,calc(100cqw-6rem))] overflow-y-auto border-r border-border-default px-6 py-4"
          gap="none"
          style={{ overflowAnchor: 'none' }}
        >
          <Inline className="h-9 shrink-0 pl-10" gap="sm">
            <Text
              as="h2"
              className={searchOpen ? 'sr-only' : 'min-w-0 flex-1'}
              id={headingId}
              size="md"
              weight="semibold"
            >
              Performance
            </Text>
            <MemberSearch
              open={searchOpen}
              onInputChange={setInput}
              onOpenChange={setSearchOpen}
              onSearchChange={(next) => {
                if (next !== search) {
                  setSearch(next);
                  setQueryRevision((revision) => revision + 1);
                }
              }}
            />
            {!searchActive && (
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
          {hasOpened && (
            <Stack className="mt-4 min-h-0 flex-1" gap="none">
              <PerformanceContent
                automationId={automationId}
                dateRange={dateRange}
                direction={direction}
                enabled={isOpen}
                queryScope={panelId}
                runQueryScope={runQueryScope}
                search={search}
                searchActive={searchActive}
                selectedStatus={status}
                updating={updating}
                onClearDate={() => setDateRange(createPerformanceDateRange('all'))}
                onDirectionChange={(next) => {
                  setDirection(next);
                  setQueryRevision((revision) => revision + 1);
                }}
                onStatusChange={(selected) => {
                  setStatus(status === selected ? null : selected);
                  setQueryRevision((revision) => revision + 1);
                }}
              />
            </Stack>
          )}
        </Stack>
      </aside>
    </>
  );
};
