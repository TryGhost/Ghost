import React, { useId, useState } from 'react';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import { Button } from '@tryghost/shade/components';
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
  const rangeLabel = PERFORMANCE_RANGES.find((range) => range.value === dateRange.value)!.label;
  const panelId = useId();
  const headingId = useId();
  const requestId = `${panelId}:${requestRevision}`;
  // Sorting refreshes only the list; status interactions refresh counts and list together.
  const listRequestId = `${requestId}:${listRevision}`;

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
        {/* Size the content against the canvas, not the animated clipping panel. */}
        <Box className="flex h-full w-[min(480px,calc(100cqw-6rem))] flex-col overflow-hidden border-r border-border-default px-6 py-4">
          <Inline className="h-9 pl-10" gap="none" justify="between">
            <Text as="h2" id={headingId} size="md" weight="semibold">
              Performance
            </Text>
            <PerformanceDateFilter
              value={dateRange.value}
              onChange={(value) => {
                if (value !== dateRange.value) {
                  setDateRange(createPerformanceDateRange(value));
                }
              }}
            />
          </Inline>
          {hasOpened && (
            <Stack className="mt-4 min-h-0 flex-1" gap="md">
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
              <TotalEntries automationId={automationId} dateRange={dateRange} />
              <PerformanceRuns
                automationId={automationId}
                isSelectionDisabled={isRunSelectionDisabled}
                listRequestId={listRequestId}
                requestId={requestId}
                selectedRunId={selectedRunId}
                sort={sort}
                status={status}
                onSelectRun={onSelectRun}
                onSortChange={(next) => {
                  setSort(next);
                  setListRevision((revision) => revision + 1);
                }}
                onStatusChange={(selected) => {
                  setStatus(status === selected ? null : selected);
                  setRequestRevision((revision) => revision + 1);
                }}
              />
            </Stack>
          )}
        </Box>
      </aside>
    </>
  );
};

// One counts request serves the cards and sizes the run list; both mount together.
const PerformanceRuns: React.FC<{
  automationId: string;
  requestId: string;
  listRequestId: string;
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  isSelectionDisabled: boolean;
  status: AutomationRunStatusFilter | null;
  sort: RunSort;
  onStatusChange: (status: AutomationRunStatusFilter) => void;
  onSortChange: (sort: RunSort) => void;
}> = ({
  automationId,
  requestId,
  listRequestId,
  selectedRunId,
  onSelectRun,
  isSelectionDisabled,
  status,
  sort,
  onStatusChange,
  onSortChange,
}) => {
  const counts = useAutomationStatusStats(automationId, requestId);
  return (
    <>
      <StatusCounts counts={counts} selectedStatus={status} onStatusChange={onStatusChange} />
      <RunList
        automationId={automationId}
        isSelectionDisabled={isSelectionDisabled}
        listRequestId={listRequestId}
        selectedRunId={selectedRunId}
        sort={sort}
        status={status}
        onSelectRun={onSelectRun}
        onSortChange={onSortChange}
      />
    </>
  );
};
