import React, { useId, useState } from 'react';
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

export const PerformanceSidebar: React.FC<{ automationId: string }> = ({ automationId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [dateRange, setDateRange] = useState(() => createPerformanceDateRange('all'));
  const rangeLabel = PERFORMANCE_RANGES.find((range) => range.value === dateRange.value)!.label;
  const panelId = useId();
  const headingId = useId();

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
        {/* Size the content against the canvas, not the animated clipping panel. */}
        <Box className="h-full w-[min(480px,calc(100cqw-6rem))] overflow-y-auto border-r border-border-default px-6 py-4">
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
              <StatusCounts automationId={automationId} />
              <RunList automationId={automationId} />
            </Stack>
          )}
        </Box>
      </aside>
    </>
  );
};
