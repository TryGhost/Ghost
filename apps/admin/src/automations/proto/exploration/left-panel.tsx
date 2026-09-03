import React, { useMemo, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Box, Inline, Stack } from '@tryghost/shade/primitives';
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
import { SortHead, type SortState } from '@/automations/proto/shared/sort-head';
import {
  EXIT_REASONS,
  exitReasonLabel,
  runFailed,
  startedLabel,
} from '@/automations/proto/shared/member-runs';
import { toAreaData } from '@/automations/proto/shared/chart';
import { useStickyList } from '@/automations/proto/shared/use-sticky-list';

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
type SortKey = 'member' | 'entered' | 'status';

const statusOf = (run: AutomationRun): StatusKey => {
  if (run.status === 'in_progress') {
    return 'In progress';
  }
  return run.status === 'completed' ? 'Completed' : 'Exited early';
};

// Each status carries one glyph + colour, used identically by the count cards,
// the collapsed chips and the table's Status column, so the three always read as
// the same thing.
const STATUS_FACETS: { key: StatusKey; color: string; glyph: React.ReactNode }[] = [
  { key: 'In progress', color: 'text-blue-600 dark:text-blue', glyph: <InProgressGlyph /> },
  { key: 'Completed', color: 'text-green-600 dark:text-green', glyph: <CompletedGlyph /> },
  { key: 'Exited early', color: 'text-muted-foreground', glyph: <ExitedGlyph /> },
];

// Exploration's exit-reason filter, hidden rather than removed.
//
// Where it belongs is still open: in the field's trailing slot it competes with
// search for one control's worth of meaning, beside the field it puts a second
// element on the row, and in the header it claims a scope it doesn't have. Its
// real home may be the "Exited early" status card, which is what it actually
// narrows. Off until that's settled — the menu below still works, nothing renders
// it. Phase 1 is unaffected: its funnel carries exit reason as it always has.
//
// Typed as boolean, not inferred as `false`, so flipping it back doesn't trip
// unreachable-branch lint on everything downstream.
const SHOW_EXIT_FILTER: boolean = false;

const facetColor = (status: StatusKey): string =>
  STATUS_FACETS.find((facet) => facet.key === status)?.color ?? '';
const facetGlyph = (status: StatusKey): React.ReactNode =>
  STATUS_FACETS.find((facet) => facet.key === status)?.glyph ?? null;

// A run that ended on a system fault keeps the Exited early glyph and takes a red
// dot in its corner. Swapping the glyph outright was wrong: failure is a REASON
// for exiting, not a different status, and a row whose icon disagreed with the
// column it sits in reads as a fourth state that can't be counted or filtered.
// The dot marks the one list state that's the publisher's to fix without
// claiming the row is something other than Exited early.
//
// A corner badge rather than a dot beside the glyph, because every row's icon
// then stays on the same centre line — an inline dot would nudge only the failed
// rows off-centre in a column where the rest line up.
const FailureDot: React.FC = () => (
  <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-state-danger" />
);

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

type EnrichedRun = { run: AutomationRun; status: StatusKey };

export const LeftPanel: React.FC<LeftPanelProps> = ({
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
  const gutter = 'px-6';

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
  const summaryHidden = Boolean(exitFilter) || query.trim().length > 0;

  // Newest first: the question this table answers is "who's in here now".
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'entered', direction: 'desc' });
  const { scrollRef, sentinelRef, stickyBlockRef, stickyBarRef, stuck } = useStickyList();

  const chartData = toAreaData(metrics.enrollments_by_day, {
    range: range === 'all' ? undefined : Number(range),
    label: 'Entries',
  });
  const chartMax = Math.max(...chartData.map((point) => point.value), 1);
  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label ?? 'All time';

  // All time reports the automation's own total, so it matches the number on the
  // automations list exactly; narrower ranges are summed from the visible series.
  const totalEntries =
    range === 'all' ? metrics.enrollments : chartData.reduce((sum, point) => sum + point.value, 0);

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'entered' ? 'desc' : 'asc' },
    );

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
    const order: StatusKey[] = ['In progress', 'Completed', 'Exited early'];
    rows.sort((a, b) => {
      // enrolled_at is ISO 8601, so a lexical compare is chronological.
      const cmp =
        sort.key === 'status'
          ? order.indexOf(a.status) - order.indexOf(b.status) ||
            a.run.member.name.localeCompare(b.run.member.name)
          : sort.key === 'entered'
            ? a.run.enrolled_at.localeCompare(b.run.enrolled_at)
            : a.run.member.name.localeCompare(b.run.member.name);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [searched, statusFilter, exitFilter, sort]);

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

  // Drills into the rows. Lives in the search field's trailing slot rather than
  // beside it: both narrow the same table, so one control that filters is easier to
  // place than two that sit side by side — and it takes a whole element out of the
  // row above the table.
  //
  // InputGroupButton, not Button. It's the primitive built for this slot: icon-xs is
  // 24px against the field's own height, where a plain size="icon" Button is 36px and
  // overflows a 32px field. The clear button beside it had the same fault.
  const exitMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton aria-label="Filter members" size="icon-sm">
          <LucideIcon.Funnel strokeWidth={2} />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Exit reason</DropdownMenuLabel>
        {EXIT_REASONS.map((reason) => (
          <DropdownMenuItem
            key={reason.id}
            onSelect={() => setExitFilter(exitFilter === reason.id ? null : reason.id)}
          >
            {reason.label}
            <LucideIcon.Check
              className={cn(
                'ms-auto text-primary',
                exitFilter === reason.id ? 'opacity-100' : 'opacity-0',
              )}
            />
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
      {/* No autoFocus: the field is mounted on load, where taking focus would be
                taking it from wherever the reader was. */}
      <InputGroupInput
        placeholder="Search members…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      {/* With no close button to lean on, clearing belongs to the field — and
                only while there's something to clear. */}
      {(query || SHOW_EXIT_FILTER) && (
        <InputGroupAddon align="inline-end">
          {query && (
            <InputGroupButton
              aria-label="Clear search"
              size="icon-sm"
              onClick={() => onQueryChange('')}
            >
              <LucideIcon.X strokeWidth={2} />
            </InputGroupButton>
          )}
          {SHOW_EXIT_FILTER && exitMenu}
        </InputGroupAddon>
      )}
    </InputGroup>
  );

  // Entry window. Exposed rather than hidden behind an icon: it scopes everything
  // in the card it sits in, so what it's set to has to be readable without opening
  // anything.
  const rangeMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* 24px off the card's top and right, matching the canvas HUD's own
                    inset so the two floating-control positions agree.
                    
                    Both are made up of the card's padding plus a margin, because the
                    padding belongs to the whole card and moving it would move the metric
                    too: py-3 (12px) + mt-3 gets the top to 24, px-4 (16px) + mr-2 gets
                    the right there. align="start" is what hangs it from the top edge in
                    the first place, level with the metric's label row. */}
        {/* Default size, not sm. sm is h-7 with size-3 icons, which read a step
                    below every other labelled control on the screen — the filter chips
                    below already made this call for the same reason (Shade's Filters
                    pattern renders at the control height, so members and comments look
                    like this too). */}
        <Button className="mt-3 mr-2 shrink-0" type="button" variant="outline">
          <LucideIcon.Calendar strokeWidth={2} />
          {rangeLabel}
          <LucideIcon.ChevronDown strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {RANGE_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => setRange(option.value)}>
            {option.label}
            <LucideIcon.Check
              className={cn(
                'ms-auto text-primary',
                range === option.value ? 'opacity-100' : 'opacity-0',
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Floating chrome: the controls sit in the screen's top strip, on the
                same baseline as the back arrow and title floating to their left, so the
                top of the screen reads as one row rather than starting again below it.

                Docked header: there is no strip to borrow — the bar above already owns
                that row — so the pane titles itself and keeps its controls on its own
                baseline. Outside the scroll container either way, so they stay put. */}

      {/* An applied filter gets its own row beneath the controls, the way the
                members page does it — so what's narrowing the list is always visible
                rather than hidden inside the button that set it. "All time" is the
                default, so it isn't a filter and doesn't earn a row. */}
      {exitFilter && (
        <FilterBar className={cn('shrink-0 pb-3', gutter)}>
          {/* One child, not one per chip: FilterBar justifies between its
                        children so it can hold filters at the left and controls like
                        "Save view" at the right, and handing it two peer chips pushed
                        them to opposite ends. Grouped, they append to each other and
                        the right-hand slot stays free. */}
          <Inline align="center" gap="sm" wrap>
            {/* Value only. The field name was carrying its weight when
                            the chip read "Entered: Last 30 days", but every value
                            here already names its own field — a timeframe reads as a
                            timeframe, "Unsubscribed" reads as a reason — so the
                            prefix was repeating what the words underneath it said. */}
            {/* Default size, not sm: Shade's own Filters pattern renders
                            its chips at md — h-(--control-height), px-2.5, size-4
                            icon — so these now match the chips on members and
                            comments rather than sitting a size below them. The X
                            takes Button's base svg size for the same reason. */}
            {exitFilter && (
              <Button type="button" variant="outline" onClick={() => setExitFilter(null)}>
                {exitReasonLabel(exitFilter)}
                <LucideIcon.X strokeWidth={2} />
              </Button>
            )}
          </Inline>
        </FilterBar>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* Chart + counts. Scrolls away under the sticky bar below. No section
                heading — the automation's own title already names what this is.
                pb-4 holds the count cards off the table header: with search moved to
                the top strip, the sticky bar below collapses to nothing until it
                sticks, so there's no chrome left in between to separate them. */}
        {/* pt-0: the strip above already ends in pb-3, and its own top padding
                on top of that held the chart too far off the Performance label. */}
        <div className={cn('flex flex-col pt-0 pb-4', gutter)}>
          {/* Collapses on a grid-rows 0fr→1fr, the same technique the sticky
                    bar below uses to roll its chips in — one idiom for "this region
                    folds away" rather than two. The mb-4 rides inside the collapsing
                    element on purpose: as a gap on the flex parent it would survive
                    the collapse and leave 16px of nothing above the cards. */}
          <div
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
              summaryHidden ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
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
                    {rangeMenu}
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

          {/* Three counts in a row. They both report and filter, and sit above
                    the sticky bar so they scroll away as it sticks — the table then
                    always lands directly beneath the bar. */}
          <div className="grid grid-cols-3 gap-3">
            {STATUS_FACETS.map((facet) => {
              const active = statusFilter === facet.key;
              return (
                <button
                  key={facet.key}
                  aria-pressed={active}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-foreground bg-muted-foreground/10'
                      : 'border-border-default hover:bg-interactive-hover',
                  )}
                  type="button"
                  onClick={() => setStatusFilter(active ? null : facet.key)}
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

        {/* The instant this scrolls out the top, the bar below has stuck. */}
        <div ref={sentinelRef} className="h-px" />

        <div ref={stickyBlockRef}>
          {/* Sticky bar: now only the status chips, which roll in once the count
                    cards above have scrolled off (grid-rows 0fr→1fr so it animates).
                    Search left this bar for the top strip, so with nothing stuck the bar
                    collapses to nothing rather than holding empty space. */}
          {/* pb only, no pt: the header strip above already ends on pb-3, and
                    stacking this bar's own top padding on top of that read as a gap
                    between the chips and the header rather than as the chips sitting
                    under it. */}
          {/* Border only while stuck: collapsed, the bar has no height, and
                    an unconditional rule would hang above the table as a stray line.
                    Stuck, it marks where the pinned chrome ends and the scrolling
                    rows begin. */}
          <div
            ref={stickyBarRef}
            className={cn(
              'sticky top-0 z-20',
              gutter,
              'bg-background',
              stuck && 'border-b border-border-default pb-4',
            )}
          >
            <div
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                stuck ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="flex gap-2">
                  {STATUS_FACETS.map((facet) => {
                    const active = statusFilter === facet.key;
                    return (
                      <button
                        key={facet.key}
                        aria-pressed={active}
                        className={cn(
                          // rounded-md, not a pill — Shade's Filters
                          // pattern (the members page's chips) defaults
                          // to md, so filter-shaped controls share one
                          // radius everywhere.
                          'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-sm transition-colors',
                          active
                            ? 'border-foreground bg-muted-foreground/10'
                            : 'border-border-default hover:bg-interactive-hover',
                        )}
                        title={facet.key}
                        type="button"
                        onClick={() => setStatusFilter(active ? null : facet.key)}
                      >
                        <span className={facet.color}>{facet.glyph}</span>
                        {/* Selected lifts the count to full text colour — the border and
                                                fill mark the chip, but keeping its number muted made the
                                                active filter look no more current than the idle ones. */}
                        {/* font-mono: three counts read side by side
                                                and get compared, so they're the repeated-
                                                readout case rather than the headline one. */}
                        <span
                          className={cn(
                            'font-mono tabular-nums',
                            active ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {formatNumber(counts[facet.key] ?? 0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Exploration's row-scoped controls, directly above the rows they
                    narrow. Inside the sticky block, so they pin to the top with the
                    status chips and stay reachable however far down the list you are —
                    searching a long table from a field that has scrolled away is the
                    thing this avoids. */}
          <div className={cn('pb-3', gutter)}>{searchField}</div>

          {/* Member table. table-fixed keeps the Entered/Status widths steady. */}
          <div className={cn('pb-6', gutter)}>
            <Table className="table-fixed" data-testid="float-entries-table">
              {/* border-b-0 on both: Shade gives thead and its row a bottom
                            border, but this header's single rule is the SortHead cells'
                            inset shadow (a border wouldn't travel when they stick) — left
                            on, the two lines doubled up at rest. */}
              <TableHeader className="border-b-0">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <SortHead label="Member" sort={sort} sortKey="member" onSort={onSort} />
                  <SortHead
                    className="w-28"
                    label="Entered"
                    sort={sort}
                    sortKey="entered"
                    onSort={onSort}
                  />
                  <SortHead
                    className="w-20"
                    label="Status"
                    sort={sort}
                    sortKey="status"
                    onSort={onSort}
                  />
                </TableRow>
              </TableHeader>
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
                        {/* Icon only — the cards above name each state.
                                                The title is the one place the exit reason
                                                surfaces in the table, and only for failures,
                                                where the dot has raised a question the row
                                                otherwise can't answer. */}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};
