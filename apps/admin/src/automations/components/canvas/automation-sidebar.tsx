import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useAutomationPerformanceStats } from '@/automations/hooks/use-automation-performance-stats';
import React, { useId, useState } from 'react';
import type {
  AutomationRunStatusFilter,
  AutomationTrigger,
} from '@tryghost/admin-x-framework/api/automations';
import {
  Button,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  Input,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
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

type AutomationSidebarTab = 'performance' | 'settings';
type AutomationMetadata = 'hidden' | 'editable' | 'readonly';

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
  selectedRunId: string | null;
  onSelectRun: (id: string, memberName: string) => void;
  isRunSelectionDisabled: boolean;

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
  selectedRunId,
  onSelectRun,
  isRunSelectionDisabled,
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

  const statusCounts = (compact = false) => (
    <StatusCounts
      compact={compact}
      data={counts}
      isLoading={isLoading}
      selectedStatus={selectedStatus}
      onStatusChange={onStatusChange}
    />
  );

  return (
    <RunList
      key={`${automationId}:${JSON.stringify(dateRange.searchParams)}`}
      automationId={automationId}
      dateRange={dateRange}
      direction={direction}
      enabled={enabled}
      isSelectionDisabled={isRunSelectionDisabled}
      queryScope={runQueryScope}
      search={search}
      selectedRunId={selectedRunId}
      status={searchActive ? null : selectedStatus}
      stickySummary={!searchActive && statusCounts(true)}
      summary={
        !searchActive && (
          <Stack gap="md">
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
            {statusCounts()}
          </Stack>
        )
      }
      updating={updating}
      onDirectionChange={onDirectionChange}
      onSelectRun={onSelectRun}
    />
  );
};

export const AutomationSidebar: React.FC<{
  automationId: string;
  name: string;
  description: string;
  triggerTierScope: AutomationTrigger['trigger_tier_scope'];
  performanceEnabled: boolean;
  metadata: AutomationMetadata;
  onDetailsChange: (details: { name: string; description: string }) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRunId: string | null;
  onSelectRun: (id: string, memberName: string) => void;
  isRunSelectionDisabled: boolean;
}> = ({
  automationId,
  name,
  description,
  triggerTierScope,
  performanceEnabled,
  metadata,
  onDetailsChange,
  isOpen,
  onOpenChange,
  selectedRunId,
  onSelectRun,
  isRunSelectionDisabled,
}) => {
  const [selectedTab, setSelectedTab] = useState<AutomationSidebarTab>(
    performanceEnabled ? 'performance' : 'settings',
  );
  let activeTab: AutomationSidebarTab;
  switch (metadata) {
    case 'hidden':
      activeTab = performanceEnabled ? 'performance' : 'settings';
      break;
    case 'editable':
    case 'readonly':
      activeTab = performanceEnabled ? selectedTab : 'settings';
      break;
    default: {
      const _exhaustive: never = metadata;
      throw new Error(`Unknown automation metadata mode: ${String(_exhaustive)}`);
    }
  }
  const nameId = useId();
  const descriptionId = useId();
  const nameErrorId = useId();
  const isNameValid = name.trim().length > 0;
  const [searchOpen, setSearchOpen] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const searchActive = !!input || !!search;
  const updating = input !== search;
  const [hasOpened, setHasOpened] = useState(isOpen && performanceEnabled);
  const [status, setStatus] = useState<AutomationRunStatusFilter | null>(null);
  const [direction, setDirection] = useState<RunSortDirection>('desc');
  const [queryRevision, setQueryRevision] = useState(0);
  const [dateRange, setDateRange] = useState(() => createPerformanceDateRange('all'));
  const panelId = useId();
  const headingId = useId();
  // List selections refetch runs without invalidating the date-range summary.
  const runQueryScope = `${panelId}:${queryRevision}`;

  // Mount on the first opening, including the active-flow default, then retain cached content.
  if (isOpen && performanceEnabled && activeTab === 'performance' && !hasOpened) {
    setHasOpened(true);
  }

  let exitConditionDescription: string;
  switch (triggerTierScope) {
    case 'free':
    case null:
      exitConditionDescription = 'Members exit early if they unsubscribe.';
      break;
    case 'all_paid':
      exitConditionDescription =
        'Members exit early if they unsubscribe or cancel their subscription.';
      break;
    case 'selected_paid':
      exitConditionDescription =
        'Members exit early if they unsubscribe, cancel their subscription, or leave the selected tier(s).';
      break;
    default: {
      const _exhaustive: never = triggerTierScope;
      throw new Error(`Unknown automation trigger scope: ${String(_exhaustive)}`);
    }
  }

  return (
    <>
      <Button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Hide automation sidebar' : 'Show automation sidebar'}
        className="absolute top-4 left-4 z-20"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(!isOpen)}
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
          '@max-[960px]/automation:absolute @max-[960px]/automation:inset-y-0 @max-[960px]/automation:left-0 @max-[960px]/automation:z-10',
          isOpen ? 'w-[480px] @max-[960px]/automation:w-full' : 'w-0',
        )}
        id={panelId}
      >
        {/* Keep content at its full width while the sidebar animates open or closed. */}
        <Stack
          className="h-full w-[480px] overflow-y-auto border-r border-border-default px-6 py-4 @max-[960px]/automation:w-[100cqw]"
          gap="none"
          style={{ overflowAnchor: 'none' }}
        >
          <Text as="h2" className="sr-only" id={headingId}>
            {activeTab === 'performance' ? 'Performance' : 'Settings'}
          </Text>
          <Tabs
            className="flex min-h-0 flex-1 flex-col"
            value={activeTab}
            variant="button"
            onValueChange={(value) => {
              if (value === 'performance' || value === 'settings') {
                setSelectedTab(value);
              }
            }}
          >
            <Inline className="h-9 shrink-0 pl-10" gap="sm">
              <TabsList
                aria-label="Automation sidebar"
                className={searchOpen && activeTab === 'performance' ? 'sr-only' : 'min-w-0 flex-1'}
              >
                {performanceEnabled && <TabsTrigger value="performance">Performance</TabsTrigger>}
                {metadata !== 'hidden' && <TabsTrigger value="settings">Settings</TabsTrigger>}
              </TabsList>
              {activeTab === 'performance' && (
                <>
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
                </>
              )}
            </Inline>
            <TabsContent
              className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
              hidden={activeTab !== 'performance'}
              value="performance"
              forceMount
            >
              {performanceEnabled && hasOpened && (
                <Stack className="mt-4 min-h-0 flex-1" gap="none">
                  <PerformanceContent
                    automationId={automationId}
                    dateRange={dateRange}
                    direction={direction}
                    enabled={isOpen && activeTab === 'performance'}
                    isRunSelectionDisabled={isRunSelectionDisabled}
                    queryScope={panelId}
                    runQueryScope={runQueryScope}
                    search={search}
                    searchActive={searchActive}
                    selectedRunId={selectedRunId}
                    selectedStatus={status}
                    updating={updating}
                    onClearDate={() => setDateRange(createPerformanceDateRange('all'))}
                    onDirectionChange={(next) => {
                      setDirection(next);
                      setQueryRevision((revision) => revision + 1);
                    }}
                    onSelectRun={onSelectRun}
                    onStatusChange={(selected) => {
                      setStatus(status === selected ? null : selected);
                      setQueryRevision((revision) => revision + 1);
                    }}
                  />
                </Stack>
              )}
            </TabsContent>
            {metadata !== 'hidden' && (
              <TabsContent className="mt-6" value="settings">
                <Stack gap="xl">
                  <Field data-invalid={!isNameValid || undefined}>
                    <FieldLabel htmlFor={nameId}>Name</FieldLabel>
                    <Input
                      aria-describedby={!isNameValid ? nameErrorId : undefined}
                      aria-invalid={!isNameValid || undefined}
                      disabled={metadata === 'readonly'}
                      id={nameId}
                      maxLength={191}
                      value={name}
                      onChange={(event) =>
                        onDetailsChange({ name: event.target.value, description })
                      }
                    />
                    {!isNameValid && (
                      <FieldError id={nameErrorId}>Add an automation name.</FieldError>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
                    <Textarea
                      disabled={metadata === 'readonly'}
                      id={descriptionId}
                      maxLength={2000}
                      rows={4}
                      value={description}
                      onChange={(event) =>
                        onDetailsChange({ name, description: event.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Exit conditions</FieldLabel>
                    <FieldDescription>{exitConditionDescription}</FieldDescription>
                  </Field>
                </Stack>
              </TabsContent>
            )}
          </Tabs>
        </Stack>
      </aside>
    </>
  );
};
