import React, { useMemo, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import {
  FilterBar,
  GhAreaChart,
  KpiCardHeaderLabel,
  KpiCardHeaderValue,
} from '@tryghost/shade/patterns';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import type { AutomationRun, ExitReason } from '@/automations/proto/shared/mock';
import type { LeftPanelProps } from '@/automations/proto/shared/left-panel-types';
import {
  CompletedGlyph,
  ExitedGlyph,
  InProgressGlyph,
} from '@/automations/proto/shared/run-glyphs';
import { SettingsPanel, type SettingsPanelProps } from './settings-panel';

// The shared contract plus what only this lane's pane needs — settings live here,
// not in LeftPanelProps, because no other lane's pane has them.
export interface ExplorationLeftPanelProps extends LeftPanelProps {
  settings: SettingsPanelProps;
}

type PaneTab = 'performance' | 'settings';
import {
  EXIT_REASONS,
  exitReasonLabel,
  runFailed,
  startedLabel,
} from '@/automations/proto/shared/member-runs';
import { toAreaData } from '@/automations/proto/shared/chart';

// The float concept's left pane: search + filters roll up into a sticky bar as
// the cards scroll off, over a table of the members who've entered. The read of
// the data it settled on:
//
// - All time by default. Coming in pre-filtered to 30 days meant the totals here
//   silently disagreed with the automations list, which is the first thing anyone
//   checks. The timeframe is still there, it just isn't applied for you.
// - Three statuses instead of four. "Exited early" absorbs every early ending —
//   unsubscribed, upgraded, failed — because from the flow's point of view they
//   are one outcome: the member stopped before the end. Why they left is a
//   property of that member, not a column in this table. The three match the
//   shared run vocabulary in shared/member-runs, so the pane and anything else
//   describing a run agree.
// - "Entered" rather than "Started", which was ambiguous about whether it meant
//   the run or the member.

const CHART_HEIGHT = 'h-44';

type StatusKey = 'In progress' | 'Completed' | 'Exited early';

const statusOf = (run: AutomationRun): StatusKey => {
  if (run.status === 'in_progress') {
    return 'In progress';
  }
  return run.status === 'completed' ? 'Completed' : 'Exited early';
};

// Each status carries one mark, used identically by the count cards, the filter
// menu and the table's Status column, so the three always read as the same thing.
//
// The hand-drawn glyphs from shared/run-glyphs, the same ones Phase 1 uses — this
// lane briefly drew them with Shade's Indicator dots instead, and is back on the
// shared set so the two concepts can be compared on layout alone. The glyph is
// also what the canvas prints on a member's step, so the mark beside a name here
// is the mark on the step they're waiting at.
const STATUS_FACETS: { key: StatusKey; color: string; glyph: React.ReactNode }[] = [
  { key: 'In progress', color: 'text-blue-600 dark:text-blue', glyph: <InProgressGlyph /> },
  { key: 'Completed', color: 'text-green-600 dark:text-green', glyph: <CompletedGlyph /> },
  { key: 'Exited early', color: 'text-muted-foreground', glyph: <ExitedGlyph /> },
];

const facetColor = (status: StatusKey): string =>
  STATUS_FACETS.find((facet) => facet.key === status)?.color ?? '';
const facetGlyph = (status: StatusKey): React.ReactNode =>
  STATUS_FACETS.find((facet) => facet.key === status)?.glyph ?? null;

// A run that ended on a system fault keeps the Exited early glyph and takes a red dot in
// its corner — failure is a reason for exiting, not a fourth status. A corner badge
// rather than a dot beside the glyph, so every row's icon stays on the same centre
// line. Phase 1's mark, carried over with the glyphs.
const FailureDot: React.FC = () => (
  <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-state-danger" />
);

// The exit-reason filter was hidden here for a while, because none of the places it
// could go was right: in the search field's trailing slot it competed with search for
// one control's worth of meaning, beside the field it put a second element on a row
// that wanted one, and in the screen header it claimed a scope it doesn't have.
//
// The view bar is the place that was missing. It's the pane's own strip, it scopes
// exactly what the filter scopes, and it holds the timeframe and search alongside —
// so the filter is back on, sitting with the other two controls that narrow the same
// list. Phase 1 is unaffected: its funnel has always been in its own strip.

// Trailing check, not a radio bullet — Shade's active-option convention. Opacity
// rather than conditional render so rows keep a stable width.
const MenuCheck: React.FC<{ on: boolean }> = ({ on }) => (
  <LucideIcon.Check className={cn('ms-auto text-primary', on ? 'opacity-100' : 'opacity-0')} />
);

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

type EnrichedRun = { run: AutomationRun; status: StatusKey };

// EXPLORATION — the pane is two panels behind tabs: what the automation IS, and how
// it's DOING. Analytics is the pane the other lanes have; Settings is new here.
//
// Tabs rather than a scroll: the two answer different questions, and one is read
// while building and the other after publishing. Stacking them would put whichever
// you didn't want a screenful away, and there's no order that's right for both.
//
// Settings defaults for a stopped automation, Analytics for a running one — the
// same rule the pane's own open/closed state follows in phase 2, for the same
// reason: a stopped automation is one you're building, and a running one is one
// you're watching.
export const LeftPanel: React.FC<ExplorationLeftPanelProps> = ({
  settings,
  scenario,
  selectedMemberId,
  onSelectMember,
  query,
  onQueryChange,
}) => {
  const { automation, metrics, runs } = scenario;

  const [range, setRange] = useState('all');
  // Search is mounted open, directly above the table it narrows — there's no
  // magnifier to press and nothing to collapse back into.

  // The pane's horizontal gutter. Every band in this column — the control strip,
  // the filter chips, the summary, the sticky bar and the table — has to use the
  // same one or the left edge goes ragged, so it's named once rather than typed
  // five times. Tried at 32px and came back to 24.
  const gutter = 'px-4';

  // Two tabs: Performance — how it's doing (the chart and status counts) and
  // who (the searchable members list), in one scroll — and Settings, the
  // automation itself. Members had a tab of its own for a while; review put it
  // back under the numbers it breaks down.
  // Opens on Performance when there's something to report — the automation is
  // live or has runs — and on Settings otherwise, the same rule the screen uses
  // for whether the pane opens at all. A new automation's pane is Settings: its
  // name and description are what's left to do there.
  const [tab, setTab] = useState<PaneTab>(() =>
    scenario.automation.status === 'active' || scenario.runs.length > 0
      ? 'performance'
      : 'settings',
  );
  // Search collapses to a magnifier in the Members heading until pressed.
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusKey | null>(null);
  // Why someone left, filtered separately from the status. Deliberately not a
  // fourth status card: the three statuses are mutually exclusive outcomes, and
  // a failure is a REASON for exiting rather than a different kind of exit.
  // Selecting one implies Exited early, so it doesn't need the card as well.
  const [exitFilter, setExitFilter] = useState<ExitReason | null>(null);
  // The summary (Total entries + chart) answers "how many are entering, over
  // time", and only the timeframe changes that. Searching or filtering by exit
  // reason narrows the list beneath it and leaves it untouched — so while either
  // is active it would sit there contradicting the controls above it. It rolls
  // away instead, and comes back the moment they clear.
  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label ?? 'All time';

  // Newest first, and only newest first. The list has no column headers any more (see
  // the table), and the headers were the only place to change the order — so rather
  // than keep sort state nothing can reach, the order is fixed at the one that answers
  // the question the list is for: who's in here now.

  const chartData = toAreaData(metrics.enrollments_by_day, {
    range: range === 'all' ? undefined : Number(range),
    label: 'Entries',
  });
  const chartMax = Math.max(...chartData.map((point) => point.value), 1);

  // All time reports the automation's own total, so it matches the number on the
  // automations list exactly; narrower ranges are summed from the visible series.
  const totalEntries =
    range === 'all' ? metrics.enrollments : chartData.reduce((sum, point) => sum + point.value, 0);

  // Search narrows everything; enrich once so the counts, the filter and the
  // rendered rows can't disagree about a run's status.
  const searched = useMemo<EnrichedRun[]>(() => {
    const q = query.trim().toLowerCase();
    return runs
      .filter(
        (run) =>
          run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q),
      )
      .map((run) => ({ run, status: statusOf(run) }));
  }, [runs, query]);

  // Counts follow the search and the exit-reason filter, but NOT the active
  // status — so every card keeps showing exactly what selecting IT would give.
  // Skipping the status is what lets the cards stay comparable; honouring the
  // exit reason is what keeps a card's number from promising rows the filter
  // would then hide.
  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    searched
      .filter(({ run }) => !exitFilter || run.exit_reason === exitFilter)
      .forEach(({ status }) => {
        tally[status] = (tally[status] ?? 0) + 1;
      });
    return tally;
  }, [searched, exitFilter]);

  const sorted = useMemo(() => {
    const byStatus = statusFilter
      ? searched.filter((row) => row.status === statusFilter)
      : [...searched];
    const rows = exitFilter
      ? byStatus.filter((row) => row.run.exit_reason === exitFilter)
      : byStatus;
    // enrolled_at is ISO 8601, so a lexical compare is chronological. Negated for
    // newest first.
    rows.sort((a, b) => -a.run.enrolled_at.localeCompare(b.run.enrolled_at));
    return rows;
  }, [searched, statusFilter, exitFilter]);

  // Filtering the list no longer de-selects the member. It used to: a member the
  // list had hidden was still highlighted on the canvas, with nothing on screen
  // naming them, so the selection read as stuck and clearing it for you was the
  // lesser evil. The canvas now carries a button with the member's name and the
  // way out built in, so who's selected is stated whether or not their row is
  // visible — and a filter silently throwing away the run you were reading is the
  // worse behaviour of the two. Selection ends when the user ends it.

  // Declared here, below every value they read, and not up with the other consts.
  // These are JSX built eagerly, so a reference inside one is evaluated the moment
  // it's created — sitting above `rangeLabel` and `exitFilter` put them in those
  // bindings' temporal dead zone and threw ReferenceError on first render (which
  // surfaces as Ghost's "Loading interrupted", and which tsc cannot see: the types
  // are all correct, only the order is wrong).
  // Search and the two filter menus are declared once and placed differently per
  // release, because Exploration splits them by SCOPE and phase 1 doesn't.
  //
  // The split is the point. The timeframe sets the entry window — the summary, the
  // chart and the counts all answer to it — so it belongs to the summary and sits
  // in the chart card. Search and exit reason only narrow the rows beneath, so they
  // belong to the table and sit directly above it. Phase 1 keeps everything in one
  // funnel in its own strip, which is the affordance the rest of Ghost uses.

  // Three menus rather than one funnel, now that find mode has a row to put them on.
  // A funnel is what you reach for when there's one slot for every filter; with the
  // room to show them, each says what it's set to without being opened.
  // Equal columns, not a wrapping row. Three buttons sized to their own labels made
  // a ragged row that re-laid itself every time a value changed — "All time" is half
  // the width of "Any exit reason", and picking one shuffled the other two. A grid
  // holds each in place, so changing a filter changes only its own words.
  // One funnel, beside the search field — the members page's arrangement. Everything
  // it holds is in one menu because the strip has room for one control.
  const filterMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Ghost with its word, as on the members page. h-9 to sit level with
            the search button and field beside it. The word is the label, so no
            aria-label. */}
        <Button className="h-9 shrink-0" type="button" variant="ghost">
          <LucideIcon.ListFilter strokeWidth={2} />
          Filter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Entries</DropdownMenuLabel>
        {RANGE_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => setRange(option.value)}>
            {option.label}
            <MenuCheck on={range === option.value} />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {STATUS_FACETS.map((facet) => (
          <DropdownMenuItem
            key={facet.key}
            onSelect={() => {
              setStatusFilter(statusFilter === facet.key && !exitFilter ? null : facet.key);
              setExitFilter(null);
            }}
          >
            {facet.key}
            <MenuCheck on={statusFilter === facet.key && exitFilter === null} />
          </DropdownMenuItem>
        ))}
        {/* The reasons run straight on from the statuses, in one list. They were a
                    section of their own under "Exited early, because", which was accurate and
                    read as a second question — you had to notice a heading to understand that
                    picking from it also set the status above.
                    
                    As one list it's what it always was: what happened to this run, in
                    descending specificity. "Exited early" is the general answer and each
                    reason is a more particular one, so choosing a reason sets the status with
                    it and the list never offers a combination with no runs in it. */}
        {EXIT_REASONS.map((reason) => (
          <DropdownMenuItem
            key={reason.id}
            onSelect={() => {
              const on = exitFilter === reason.id;
              setStatusFilter(on ? null : 'Exited early');
              setExitFilter(on ? null : reason.id);
            }}
          >
            {reason.label}
            <MenuCheck on={exitFilter === reason.id} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // h-9 rather than the h-(--control-height) default. 32px left the field a step
  // under the icon buttons and the canvas member chip, which are all size-9 —
  // Shade's own control height and its icon-button size disagree with each other,
  // and 36 is the one this screen already uses everywhere else.
  const searchField = (
    <InputGroup className="h-9 min-w-0 flex-1">
      <InputGroupAddon>
        <LucideIcon.Search />
      </InputGroupAddon>
      {/* Focused on arrival: it only mounts because the magnifier was pressed. */}
      <InputGroupInput
        placeholder="Search members…"
        value={query}
        autoFocus
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </InputGroup>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        value={tab}
        variant="button"
        onValueChange={(next) => setTab(next as PaneTab)}
      >
        {/* Shade's button tabs — the "stable selection width" kind — as the
            pane card's header row. mt-3 puts them level with the floating
            buttons (the card starts 8px down, the buttons 20px); the sidebar
            toggle, pinned to the screen's corner, ends the row on the right,
            so it's left clear. */}
        <TabsList className="mx-4 mt-3 mb-6 shrink-0">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="performance">
          {/* The Performance tab: the entries chart, then the three status counts. */}
          <div className={cn('flex flex-col pt-0 pb-8', gutter)}>
            <div
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                'grid-rows-[1fr] opacity-100',
              )}
            >
              <div className="overflow-hidden">
                <Box className="mb-4 rounded-lg border border-border-default px-4 py-3">
                  <Stack gap="sm">
                    {/* The entry window sits IN the card it scopes. Everything here
                              — the total, the chart, and the counts below — is measured
                              over it, so putting it anywhere else made it look like one
                              more control acting on the list. align="start" so it hangs
                              off the metric's label row rather than centring against a
                              two-line block. */}
                    <Inline align="start" justify="between">
                      {/* KpiCardHeaderLabel + KpiCardHeaderValue rather than MetricValue.
                          Main removed MetricValue from Shade's public exports as dead
                          (#30142) — it's internal now, and the KpiCard pair is the
                          supported way to reach the same rendering: the label carries the
                          identical chrome and the value wraps MetricValue itself. Stack
                          gap="sm" is gap-2, the gap MetricValue put between them. */}
                      <Stack gap="sm">
                        <KpiCardHeaderLabel>
                          {/* Matches the shipping KPI for a member count
                              (posts/analytics/growth labels "Free members" with the same
                              icon and weight). Zap was the trigger's icon, not this
                              metric's — what's counted here is people, not firings. */}
                          <LucideIcon.User size={16} strokeWidth={1.5} />
                          Total entries
                        </KpiCardHeaderLabel>
                        <KpiCardHeaderValue value={formatNumber(totalEntries)} />
                      </Stack>
                    </Inline>
                    <GhAreaChart
                      className={`${CHART_HEIGHT} w-full`}
                      color="var(--chart-blue)"
                      data={chartData}
                      id={`float-entries-${automation.id}`}
                      range={chartData.length}
                      showYAxisValues={false}
                      yAxisRange={[0, chartMax]}
                    />
                  </Stack>
                </Box>
              </div>
            </div>

            {/* Three counts in a row. Each filters the members list below to it. */}
            <div className="grid grid-cols-3 gap-3">
              {STATUS_FACETS.map((facet) => {
                const active = statusFilter === facet.key;
                return (
                  <button
                    key={facet.key}
                    aria-pressed={active}
                    // No pressed look — the filter chip that appears below the
                    // Members heading already says the list is narrowed, and says
                    // it where the list is. aria-pressed stays for screen readers,
                    // which don't get the chip's position as a cue.
                    className="rounded-lg border border-border-default px-4 py-3 text-left transition-colors hover:bg-interactive-hover"
                    type="button"
                    // Filters the list below to that status — pressing one asks
                    // "who are they?" — and pressing it again clears it.
                    onClick={() => {
                      setStatusFilter(active ? null : facet.key);
                      setExitFilter(null);
                    }}
                  >
                    <Stack gap="sm">
                      <KpiCardHeaderLabel>
                        <span className={facet.color}>{facet.glyph}</span>
                        {facet.key}
                      </KpiCardHeaderLabel>
                      <KpiCardHeaderValue value={formatNumber(counts[facet.key] ?? 0)} />
                    </Stack>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Who — the members list, under the summary in the same scroll. A
              heading marks where "how is it doing" ends and the roster begins.
              Its controls (search, Filter, and what's narrowing the list as
              chips) stick to the top of the tab as the table scrolls beneath,
              so they're in reach all the way down. Status is filtered from the
              Filter menu or a card above — no separate row of status pills. */}
          {/* The heading row, the members page's shape: the title at the left,
              search and Filter at the right. Search is a magnifier until
              pressed, then takes the title's place as a field (closing it
              clears it). The whole row sticks to the top of the tab. */}
          <div className={cn('sticky top-0 z-20 bg-background pb-3', gutter)}>
            <div className="flex h-9 items-center gap-1">
              {searchOpen ? (
                <>
                  {searchField}
                  <Button
                    aria-label="Close search"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      onQueryChange('');
                      setSearchOpen(false);
                    }}
                  >
                    <LucideIcon.X strokeWidth={2} />
                  </Button>
                </>
              ) : (
                <>
                  <Text as="h3" className="min-w-0 flex-1" size="md" weight="semibold">
                    Members
                  </Text>
                  <Button
                    aria-label="Search members"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setSearchOpen(true)}
                  >
                    <LucideIcon.Search strokeWidth={2} />
                  </Button>
                </>
              )}
              {filterMenu}
            </div>
            {/* What's narrowing the list, stated below the controls rather than hidden
                      inside the funnel that set it — the members page's row, and the reason the
                      funnel needs no active state of its own.
                      
                      "All time" is the default, so it isn't a filter and doesn't earn a chip.
                      Status and exit reason share one chip: choosing a reason sets the status
                      with it, so two chips would be one fact stated twice. */}
            {(range !== 'all' || statusFilter || exitFilter) && (
              <FilterBar className="shrink-0 pb-3">
                {/* One child, not one per chip: FilterBar justifies between its children
                              so it can hold filters at the left and controls like "Save view" at
                              the right, and handing it peers pushed them to opposite ends. */}
                <Inline align="center" gap="sm" wrap>
                  {range !== 'all' && (
                    <Button type="button" variant="outline" onClick={() => setRange('all')}>
                      {rangeLabel}
                      <LucideIcon.X strokeWidth={2} />
                    </Button>
                  )}
                  {statusFilter && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStatusFilter(null);
                        setExitFilter(null);
                      }}
                    >
                      {exitFilter ? exitReasonLabel(exitFilter) : statusFilter}
                      <LucideIcon.X strokeWidth={2} />
                    </Button>
                  )}
                </Inline>
              </FilterBar>
            )}
          </div>
          {/* Member table. table-fixed keeps the Entered/Status widths steady. */}
          <div className={cn('pb-6', gutter)}>
            <Table className="table-fixed" data-testid="float-entries-table">
              {/* No header row. Three columns, and not one of them needed naming:
                          the dot is explained by the count cards and chips above, the names
                          are obviously names, and the dates now say "Entered" in the cell
                          itself. A header of one blank cell and two labels restating what
                          the rows already showed was a band of chrome charging rent.

                          It went with sorting, which lived in those heads — see the fixed
                          order above. */}
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      className="py-6 text-center text-sm text-muted-foreground"
                      colSpan={3}
                    >
                      No members match.
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map(({ run, status }) => {
                  const isSelected = run.id === selectedMemberId;
                  return (
                    <TableRow
                      key={run.id}
                      aria-selected={isSelected}
                      // Selection is Shade's own: TableRow ships
                      // data-[state=selected]:bg-muted, so the state goes through
                      // data-state and the fill comes from the component rather
                      // than from a class here. Hover matches the interactive
                      // controls above it.
                      //
                      // Plain grey either way. A rounded blue ring was tried via a
                      // tr::before overlay (radius doesn't work on collapsed table
                      // rows directly) and broke row layout — positioned table rows
                      // aren't dependable. The canvas's blue review ring carries the
                      // "you're in this member's run" signal on its own.
                      className="cursor-pointer transition-colors hover:bg-interactive-hover"
                      data-state={isSelected ? 'selected' : undefined}
                      // Toggle: clicking the selected row again de-selects it.
                      onClick={() => onSelectMember(isSelected ? null : run.id)}
                    >
                      {/* Phase 1's row: member, entered, status — the glyph at the
                                  right in its own centred column, the date at full strength. */}
                      <TableCell className="min-w-0 p-4 group-hover:bg-transparent">
                        <span
                          className={`block min-w-0 truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}
                        >
                          {run.member.name}
                        </span>
                      </TableCell>
                      <TableCell className="w-28 p-4 align-middle group-hover:bg-transparent">
                        <span className="block truncate text-base">
                          {startedLabel(run.enrolled_at)}
                        </span>
                      </TableCell>
                      <TableCell className="w-20 p-4 text-center align-middle group-hover:bg-transparent">
                        {/* Icon only — the cards above name each state. The title is
                                    the one place the exit reason surfaces in the table, and
                                    only for failures, where the dot has raised a question the
                                    row otherwise can't answer. */}
                        <div
                          className={cn('flex justify-center', facetColor(status))}
                          title={
                            runFailed(run) ? `${status} — ${exitReasonLabel('failed')}` : status
                          }
                        >
                          <span className="relative flex">
                            {facetGlyph(status)}
                            {runFailed(run) && <FailureDot />}
                          </span>
                          <span className="sr-only">
                            {runFailed(run) ? exitReasonLabel('failed') : status}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="settings">
          <SettingsPanel {...settings} className="px-4" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
