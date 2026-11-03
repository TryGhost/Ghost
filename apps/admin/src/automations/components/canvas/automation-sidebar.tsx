import { getTriggerTierIds } from '@/automations/utils/trigger-rules';
import type { PerformanceDateRange } from '@/automations/utils/performance-date-range';
import { useAutomationPerformanceStats } from '@/automations/hooks/use-automation-performance-stats';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import React, { useId, useState } from 'react';
import type {
  AutomationPerformanceStats,
  AutomationTriggerRule,
  AutomationRunStatusFilter,
} from '@tryghost/admin-x-framework/api/automations';
import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';
import { mapAutomationEntryStats } from '@/automations/utils/automation-entry-stats';
import { mapAutomationStatusStats } from '@/automations/utils/automation-status-stats';
import {
  Button,
  EmptyIndicator,
  Field,
  FieldLabel,
  FieldDescription,
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
import type { EditorChrome } from '@/automations/components/types';
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

// What the server reports for an automation nobody has started: every count at
// zero and today's empty day. An unsaved automation can't be asked, so it shows this.
const unstartedStats = (): AutomationPerformanceStats => {
  const { endDate, timezone } = getRangeDates(1);
  const today = formatQueryDate(endDate);
  return {
    automation_id: '',
    total_run_count: 0,
    in_progress_run_count: 0,
    completed_run_count: 0,
    exited_early_run_count: 0,
    entries: [{ date: today, count: 0 }],
    entry_window: {
      date_from: today,
      date_to: new Date(Date.parse(today) + 86_400_000).toISOString().slice(0, 10),
      bucket: 'day',
      timezone,
    },
  };
};

const UnsavedPerformance: React.FC<{ className?: string }> = ({ className }) => {
  const [stats] = useState(unstartedStats);
  return (
    <Stack className={className} gap="md">
      <TotalEntries chart={mapAutomationEntryStats(stats)} isLoading={false} />
      <StatusCounts
        data={mapAutomationStatusStats(stats)}
        isLoading={false}
        selectedStatus={null}
        onStatusChange={() => {}}
      />
      <EmptyIndicator
        className="px-4 py-12"
        description="Once someone starts your automation, they'll show here"
        role="status"
        title="No members yet"
      >
        <LucideIcon.Users />
      </EmptyIndicator>
    </Stack>
  );
};

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

// Shared by the sidebar and the header controls that move with it.
export const CHROME_EASE = 'ease-[cubic-bezier(0.22,0.61,0.36,1)]';

function getStopConditionDescription({
  triggerRules,
  tiers,
}: {
  triggerRules: readonly AutomationTriggerRule[];
  tiers: readonly Tier[];
}): string {
  // paid_subscription_changed runs stay eligible while the member matches a destination tier.
  const eligibilityRules =
    triggerRules[0]?.trigger_type === 'paid_subscription_changed'
      ? triggerRules.filter((rule) => rule.direction === 'to')
      : triggerRules;
  if (eligibilityRules.length === 0) {
    // No destination has been selected yet (or a signup's tier selection was cleared).
    return 'Members stop early if they unsubscribe or leave the selected tiers.';
  }
  const eligibilityScope = eligibilityRules[0].scope;
  const eligibleTierIds = getTriggerTierIds(eligibilityRules);
  switch (eligibilityScope) {
    case 'free':
      return 'Members stop early if they unsubscribe or start a paid subscription.';
    case null:
      return 'Members stop early if they unsubscribe.';
    case 'any_paid_tier':
      return 'Members stop early if they unsubscribe or leave any paid tier.';
    case 'specific_paid_tier': {
      const triggerNamesById = new Map(tiers.map((tier) => [tier.id, tier.name]));
      const tierNames = eligibleTierIds
        .map((id) => triggerNamesById.get(id))
        .filter((tierName): tierName is string => tierName !== undefined);
      let tierDescription = 'selected tiers';
      if (tierNames.length === 1 && tierNames.length === eligibleTierIds.length) {
        tierDescription = `${tierNames[0]} tier`;
      } else if (tierNames.length > 1 && tierNames.length === eligibleTierIds.length) {
        const tierList = new Intl.ListFormat('en', { style: 'long', type: 'disjunction' }).format(
          tierNames,
        );
        tierDescription = `${tierList} tiers`;
      }
      return `Members stop early if they unsubscribe or leave the ${tierDescription}.`;
    }
    default: {
      const _exhaustive: never = eligibilityScope;
      throw new Error(`Unknown automation stop condition: ${String(_exhaustive)}`);
    }
  }
}

export const AutomationSidebar: React.FC<{
  automationId: string;
  description: string;
  triggerRules: readonly AutomationTriggerRule[];
  tiers: readonly Tier[];
  performanceEnabled: boolean;
  metadata: AutomationMetadata;
  onDescriptionChange: (description: string) => void;
  selectedTab: AutomationSidebarTab;
  onTabChange: (tab: AutomationSidebarTab) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chrome: EditorChrome;
  // Off for the first paint, so a sidebar that starts open doesn't animate in.
  animated: boolean;
  selectedRunId: string | null;
  onSelectRun: (id: string, memberName: string) => void;
  isRunSelectionDisabled: boolean;
  isToggleHidden?: boolean;
}> = ({
  automationId,
  description,
  triggerRules,
  tiers,
  performanceEnabled,
  metadata,
  onDescriptionChange,
  isOpen,
  selectedTab,
  onTabChange,
  onOpenChange,
  chrome,
  animated,
  selectedRunId,
  onSelectRun,
  isRunSelectionDisabled,
  isToggleHidden = false,
}) => {
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
  const descriptionId = useId();
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

  const stopConditionDescription = getStopConditionDescription({
    triggerRules,
    tiers,
  });

  // Main's left-hand sidebar, kept as-is to compare against.
  const current = chrome === 'current';
  // Space between the tab row and each tab's content; Settings already uses 24px.
  const tabContentGap = current ? 'mt-4' : 'mt-6';

  const panel = (
    <Stack
      // The tab row's text centres on the header buttons' line: 28px down when docked,
      // 36px when floating (inside the card's 8px inset and border).
      className={cn(
        current
          ? 'h-full w-[480px] overflow-y-auto border-r border-border-default px-6 py-4 @max-[960px]/automation:w-[100cqw]'
          : 'h-full overflow-y-auto px-6 pb-4',
        chrome === 'floating' && 'pt-[9px]',
        chrome === 'docked' && 'pt-2.5',
      )}
      gap="none"
      style={{ overflowAnchor: 'none' }}
    >
      <Text as="h2" className="sr-only" id={headingId}>
        {activeTab === 'performance' ? 'Performance' : 'Settings'}
      </Text>
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        value={activeTab}
        variant={current ? 'button' : 'underline'}
        onValueChange={(value) => {
          if (value === 'performance' || value === 'settings') {
            onTabChange(value);
          }
        }}
      >
        <Inline
          className={cn(
            current
              ? 'h-(--control-height) shrink-0 pl-10'
              : 'h-9 shrink-0 border-b border-border-default',
            // Room for the toggle, which sits one gap past the last button: its
            // offset from the edge plus the gap equals the panel's padding, less
            // the card's 1px border when floating.
            chrome === 'docked' && 'pr-(--control-height)',
            chrome === 'floating' && 'pr-[calc(var(--control-height)-1px)]',
          )}
          gap="sm"
        >
          <TabsList
            aria-label="Automation sidebar"
            className={
              searchOpen && activeTab === 'performance'
                ? 'sr-only'
                : current
                  ? 'min-w-0 flex-1'
                  : 'w-auto min-w-0 flex-1 border-b-0'
            }
          >
            {performanceEnabled && <TabsTrigger value="performance">Performance</TabsTrigger>}
            {metadata !== 'hidden' && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>
          {activeTab === 'performance' && automationId && (
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
                  icon={current ? LucideIcon.Funnel : LucideIcon.ListFilter}
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
          {performanceEnabled && !automationId && <UnsavedPerformance className={tabContentGap} />}
          {performanceEnabled && automationId && hasOpened && (
            <Stack className={cn(tabContentGap, 'min-h-0 flex-1')} gap="none">
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
              <Field>
                <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
                <Textarea
                  disabled={metadata === 'readonly'}
                  id={descriptionId}
                  maxLength={2000}
                  rows={4}
                  value={description}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Stop conditions</FieldLabel>
                <FieldDescription>{stopConditionDescription}</FieldDescription>
              </Field>
            </Stack>
          </TabsContent>
        )}
      </Tabs>
    </Stack>
  );

  const asideProps = {
    ref: (element: HTMLElement | null) => {
      if (element) {
        element.inert = !isOpen;
      }
    },
    'aria-hidden': !isOpen,
    'aria-labelledby': headingId,
    id: panelId,
  };

  if (current) {
    return (
      <>
        <Button
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Hide automation sidebar' : 'Show automation sidebar'}
          className={cn(
            'absolute top-4 left-4 z-20 transition-transform duration-200 ease-in-out motion-reduce:transition-none',
            isToggleHidden && 'translate-x-[calc(-100%-2rem)]',
          )}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(!isOpen)}
        >
          <LucideIcon.PanelLeft strokeWidth={2} />
        </Button>
        <aside
          {...asideProps}
          className={cn(
            'shrink-0 overflow-hidden bg-surface-elevated transition-[width] duration-150 ease-out motion-reduce:transition-none',
            '@max-[960px]/automation:absolute @max-[960px]/automation:inset-y-0 @max-[960px]/automation:left-0 @max-[960px]/automation:z-10',
            isOpen ? 'w-[480px] @max-[960px]/automation:w-full' : 'w-0',
          )}
        >
          {panel}
        </aside>
      </>
    );
  }

  // Contents fade out as the sidebar starts closing and back in once it's mostly open,
  // so they never pass under the toggle mid-slide.
  const contentFade = cn(
    animated && 'transition-opacity motion-reduce:transition-none',
    isOpen ? 'opacity-100 [transition-delay:100ms] duration-200' : 'opacity-0 duration-100',
  );

  return (
    <>
      {chrome === 'floating' ? (
        // A card that slides in over the canvas, with the canvas showing around it.
        <aside
          {...asideProps}
          className={cn(
            'absolute inset-y-0 right-0 z-30 flex w-[min(480px,100%)] flex-col',
            animated &&
              `transition-transform duration-300 ${CHROME_EASE} motion-reduce:transition-none`,
            isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full',
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col p-2">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-default bg-background shadow-sm">
              <div className={cn('flex min-h-0 flex-1 flex-col', contentFade)}>{panel}</div>
            </div>
          </div>
        </aside>
      ) : (
        // Narrows by width, holding its contents at full width on the right edge so they
        // fade rather than reflow. Below 960px it covers the canvas, under the header.
        <aside
          {...asideProps}
          className={cn(
            'relative flex shrink-0 flex-col items-end overflow-hidden bg-surface-elevated',
            animated &&
              `transition-[width] duration-300 ${CHROME_EASE} motion-reduce:transition-none`,
            isOpen ? 'w-[480px] border-l border-border-default' : 'w-0',
            '@max-[960px]/automation:absolute @max-[960px]/automation:top-14 @max-[960px]/automation:right-0 @max-[960px]/automation:bottom-0 @max-[960px]/automation:z-30',
            isOpen && '@max-[960px]/automation:w-full',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 w-[480px] flex-1 flex-col @max-[960px]/automation:w-[100cqw]',
              contentFade,
            )}
          >
            {panel}
          </div>
        </aside>
      )}
      {/* Pinned to the top-right corner: over the header's row while closed, and the
          sidebar's top row while open. Like the post editor's settings toggle, it
          looks the same in both states. */}
      <Button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Hide automation sidebar' : 'Show automation sidebar'}
        className={cn(
          'absolute z-40 transition-transform duration-200 ease-in-out motion-reduce:transition-none',
          'enabled:aria-expanded:shadow-none enabled:aria-expanded:hover:bg-button-ghost-hover',
          chrome === 'floating'
            ? 'top-5 right-6 bg-surface-elevated enabled:aria-expanded:bg-surface-elevated'
            : 'top-3 right-4 enabled:aria-expanded:bg-transparent',
          // Slides off its edge while the email editor clears the canvas.
          isToggleHidden && 'translate-x-[calc(100%+2rem)]',
        )}
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(!isOpen)}
      >
        <LucideIcon.PanelRight strokeWidth={2} />
      </Button>
    </>
  );
};
