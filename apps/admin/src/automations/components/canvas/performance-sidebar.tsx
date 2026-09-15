import React, { useId, useState } from 'react';
import type { AutomationRunStatusFilter } from '@tryghost/admin-x-framework/api/automations';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { TotalEntries } from './total-entries';
import { StatusCounts } from './status-counts';
import { RunList } from './run-list';
import { PerformanceDateFilter } from './performance-date-filter';
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
  const [dateRange, setDateRange] = useState(() => createPerformanceDateRange('all'));
  const rangeLabel = PERFORMANCE_RANGES.find((range) => range.value === dateRange.value)!.label;
  const panelId = useId();
  const headingId = useId();
  const requestId = `${panelId}:${requestRevision}`;

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
        {/* Size the content against the canvas, not the animated clipping panel. */}
        <Box className={cn(
            'h-full w-[480px] overflow-y-auto border-r border-border-default px-6 py-4',
            isHistoryOpen
              ? '@max-[640px]/automation:w-[100cqw]'
              : '@max-[960px]/automation:w-[100cqw]',
          )}>
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
            <Stack className="mt-4" gap="md">
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
              <StatusCounts
                automationId={automationId}
                requestId={requestId}
                selectedStatus={status}
                onStatusChange={(selected) => {
                  setStatus(status === selected ? null : selected);
                  setRequestRevision((revision) => revision + 1);
                }}
              />
              <RunList
                automationId={automationId}
                isSelectionDisabled={isRunSelectionDisabled}
                requestId={requestId}
                selectedRunId={selectedRunId}
                status={status}
                onSelectRun={onSelectRun}
              />
            </Stack>
          )}
        </Box>
      </aside>
    </>
  );
};
