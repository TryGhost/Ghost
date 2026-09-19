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
  PageMenu,
  PageMenuItem,
  TableRow,
  Indicator,
  Tabs,
  TabsContent,
} from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import {
  FilterBar,
  GhAreaChart,
  KpiCardHeaderLabel,
  KpiCardHeaderValue,
  ViewBar,
} from '@tryghost/shade/patterns';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import type { AutomationRun, ExitReason } from '@/automations/proto/shared/mock';
import type { LeftPanelProps } from '@/automations/proto/shared/left-panel-types';
import { SettingsPanel, type SettingsPanelProps } from './settings-panel';

// The shared contract plus what only this lane's pane needs — settings live here,
// not in LeftPanelProps, because no other lane's pane has them.
export interface ExplorationLeftPanelProps extends LeftPanelProps {
  settings: SettingsPanelProps;
}
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

const statusOf = (run: AutomationRun): StatusKey => {
  if (run.status === 'in_progress') {
    return 'In progress';
  }
  return run.status === 'completed' ? 'Completed' : 'Exited early';
};

// Each status carries one mark, used identically by the count cards, the collapsed
// chips and the table's Status column, so the three always read as the same thing.
//
// EXPLORATION 2 draws them with Shade's Indicator rather than the hand-drawn glyphs
// in shared/run-glyphs, which the other lanes keep. Three dots that differ by colour
// and by STATE read as one scale with three positions on it; three different icons
// read as three unrelated things you have to learn separately. It's also a component
// the design system already owns, so the states come with their semantics attached:
//
//   In progress  info + active     — blue, pulsing. The pulse is the point: this is
//                                     the only status that is still happening, and it's
//                                     the only one that moves. Blue rather than the
//                                     green this started as, because green reads as
//                                     "went well" — a verdict on a run that hasn't
//                                     finished, and one the row next to it (Completed)
//                                     has a better claim to.
//   Completed    neutral + idle    — pale grey, filled. A run reaching the end is the
//                                     expected outcome and the one nobody needs to act
//                                     on, so it gets the quietest mark on the scale.
//
// Filled and hollow do real work across the set: filled means the run went to plan —
// still going, or finished — and hollow means it stopped short. Colour then says which
// kind. Two questions on two channels, so the four marks fall out of the pair rather
// than having to be learned one at a time.
//
// COLOUR IS NEVER THE ONLY CHANNEL, which matters most for the two that appear on
// nearly every row. In progress and Completed are told apart by lightness (see the
// note on Completed's shade) and by the pulse, which no colour vision affects; the
// two early endings are told apart from those by being hollow. And the cell carries
// the status name for screen readers either way.
//   Exited early warning + inactive — yellow, outline. Hollow because something is
//                                     missing: the member left before the end. Not
//                                     red — an early exit is normal and often the
//                                     member's own doing, not a fault.
//
// Colour now lives inside the Indicator's variant, so there's no separate `color`
// class to keep in step with the mark — the pairing can't drift.
const STATUS_FACETS: { key: StatusKey; mark: React.ReactNode }[] = [
  { key: 'In progress', mark: <Indicator state="active" variant="info" /> },
  {
    key: 'Completed',
    // gray-400, over the neutral variant's own bg-muted (gray-100, which vanished).
    //
    // The shade is chosen against the BLUE, not against the background. In progress is
    // --state-info, blue-500, at oklch L 74%. gray-500 is L 77.5% — three points apart,
    // which is no distance at all once hue is gone, so to a colourblind reader the two
    // commonest marks in the column were the same dot. gray-400 is L 87%: thirteen
    // points lighter, and separable in greyscale. It holds in dark too, where the blue
    // steps to blue-400 (L 78%).
    //
    // Lighter is also just right for what it means. Nobody needs to act on a run that
    // finished, and these are the bulk of the rows.
    mark: <Indicator className="bg-gray-400" state="idle" variant="neutral" />,
  },
  { key: 'Exited early', mark: <Indicator state="inactive" variant="warning" /> },
];

// Failed is a fourth MARK but not a fourth status. It's a reason for exiting early,
// so it isn't counted or filtered on its own — a failed run is inside the Exited
// early card and answers that chip. What it gets is its own dot and its own word in
// the table, because that's the one place a row has to explain itself.
//
// This replaces a red pip in the corner of the Exited early dot. The pip was trying
// to say "and also failed" without claiming a fourth state, and what it actually
// said was nothing legible at 4px — a smudge you had to hover to decode. A row that
// reads "Failed" needs no decoding, and the status it belongs to is one press away
// on the chips above.
//
// Red, and hollow like Exited early, because it IS an early exit — the outline is
// the shared shape, the colour is what separates a fault from a choice.
const FAILED_MARK = <Indicator state="inactive" variant="error" />;

// The status as it appears in the table: the dot, and nothing else.
//
// It has been a tinted pill and then a dot beside its word, both in a column at the
// far right. Both put the status where you had to cross the whole row to reach it,
// and the pill version turned the list into a stack of coloured blocks with the
// member's name — the thing you're actually scanning — coming second to them.
//
// Leading the row instead, as a bare mark: it's the first thing on the line and the
// last thing you have to read, because at a glance the colour alone sorts the rows
// into kinds. The word is redundant three times over — the count cards above name
// each state, the filter chips repeat them, and the marks are only four.
//
// The same dot those cards and chips print beside their own labels, which is what
// makes reading it wordless possible: you learn the vocabulary up there and spend it
// down here.
const StatusMark: React.FC<{ run: AutomationRun; status: StatusKey }> = ({ run, status }) => {
  const failed = runFailed(run);
  return (
    <>
      {failed ? FAILED_MARK : STATUS_FACETS.find((item) => item.key === status)?.mark}
      {/* The mark is the cell's only content, so the name goes in for anyone colour
              and shape don't reach — and for the rest, the title on the cell. */}
      <span className="sr-only">{failed ? exitReasonLabel('failed') : status}</span>
    </>
  );
};

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
  const gutter = 'px-6';

  const [tab, setTab] = useState(automation.status === 'active' ? 'analytics' : 'settings');
  // Collapsed to a magnifier until pressed — see the view bar.
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
  // The summary answers "how many are entering, over time", and only the timeframe
  // changes that. Searching or filtering narrows the list beneath it and leaves it
  // untouched, so while either is active it would sit there contradicting the
  // controls above it. It rolls away instead, and comes back when they clear.
  // The summary answers "how many are entering, over time", and only the timeframe
  // changes that. Searching or filtering narrows the list beneath it and leaves it
  // untouched, so while either is active it would sit there contradicting the controls
  // above it. It rolls away instead, and comes back the moment they clear — phase 1's
  // behaviour, and the reason neither control needs a mode of its own.
  const summaryHidden = Boolean(exitFilter) || Boolean(statusFilter) || query.trim().length > 0;
  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label ?? 'All time';

  // Newest first, and only newest first. The list has no column headers any more (see
  // the table), and the headers were the only place to change the order — so rather
  // than keep sort state nothing can reach, the order is fixed at the one that answers
  // the question the list is for: who's in here now.
  // Tied to the tab: this block is inside Analytics, and Radix unmounts the tab that
  // isn't showing — see useStickyList.
  const { scrollRef, sentinelRef, stickyBlockRef, stickyBarRef, stuck } = useStickyList(
    tab === 'analytics',
  );

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
        <Button aria-label="Filter" className="shrink-0" size="icon" type="button" variant="ghost">
          <LucideIcon.Funnel strokeWidth={2} />
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
      {/* No autoFocus: it's mounted with the tab, and taking focus on arrival would
                take it from wherever the reader was. */}
      <InputGroupInput
        placeholder="Search members…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </InputGroup>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The two panels. TabsContent carries the scroll, so the strip stays put
                while either side of it moves. */}
      <Tabs className="flex min-h-0 flex-1 flex-col" value={tab} onValueChange={setTab}>
        {/* Shade's ViewBar rather than a TabsList: this is the pane saying which of
                    its two views you're looking at, which is the job ViewBar and PageMenu do
                    on the analytics screens. A segmented control would have been a second
                    switching idiom for the same kind of switch.
                    
                    ViewBar keeps its Actions slot free for whatever the panels need on this
                    row later — a timeframe for Analytics, most obviously, which currently
                    sits further down. */}
        {/* No top margin, matching the canvas window beside it — that has mr/mb but
                    no mt, so its rounded top edge starts at the top of the row. The bar sat
                    16px lower, which put the pane and the canvas on two different lines for
                    no reason either of them could show.
                    
                    The gap below it belongs here rather than on each panel, so both tabs
                    clear it by the same amount — Settings had its own mt and Analytics had
                    none, so the chart came up against the bar. */}
        {/* min-h-9 so the bar is the same height on both tabs. Its controls are 36px
                    (Shade's icon button, and the search field matched to it) while the tab
                    buttons are the 32px control height — so with the controls only on
                    Analytics, the bar lost 4px on Settings and the panel below it shifted up.
                    Reserving the taller of the two is cheaper than making one of them lie
                    about its size. */}
        {/* The pane's first row, measured to the header's.
                    
                    pt-6 for the header's own 24px. min-h-9 because the header's row is 36px
                    tall — its buttons are Shade's 36px icon size — while these tabs are the
                    32px control height, so without it two rows starting at the same y ended
                    up with their contents 2px apart, which is exactly the sort of gap that
                    reads as broken rather than as different.
                    
                    mb-6 so what follows starts at 84px: 24 + 36 + 24 is the header's height,
                    and the canvas begins directly under it. The pane's first card and the
                    canvas's top edge are then the same line.
                    
                    Search and filter sit in the Actions slot. min-h-9 is what lets them:
                    the bar is 36px on both tabs whether or not they're rendered, so switching
                    view doesn't change its height. */}
        <ViewBar className={cn(gutter, 'mb-6 min-h-9 shrink-0 pt-6')}>
          {/* flex-none so the tabs take their own width and the controls get the
                        rest — Nav is flex-1 by default, which would split the row down the
                        middle and leave the search field short while the tabs sat in space. */}
          <ViewBar.Nav className="flex-none">
            {/* defaultValue, despite the name, is what PageMenuItem reads to mark
                            itself active — it's live context, not an initial value — and each
                            item carries its own onClick. onValueChange only wires the
                            responsive overflow menu, so on its own it switches nothing. Same
                            shape as the post analytics header. */}
            <PageMenu defaultValue={tab} value={tab} onValueChange={setTab}>
              <PageMenuItem value="settings" onClick={() => setTab('settings')}>
                Settings
              </PageMenuItem>
              <PageMenuItem value="analytics" onClick={() => setTab('analytics')}>
                Analytics
              </PageMenuItem>
            </PageMenu>
          </ViewBar.Nav>
          {/* Two buttons, not one funnel and not a mode: search collapses to a
                        magnifier and the filters live behind their own icon, exactly as phase 1
                        has them. The chart takes care of itself — it folds away whenever
                        either is actually narrowing the table, so neither control has to
                        announce that it's on. */}
          {/* Always rendered, even on Settings where there's nothing to search: the
                        pane toggle's twin lives at the end of this slot and has to hold its
                        place on both tabs. */}
          <ViewBar.Actions className="min-w-0 flex-1 justify-end">
            {tab === 'analytics' && (
              <>
                {searchOpen && searchField}
                {searchOpen ? (
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
                ) : (
                  <Button
                    aria-label="Search members"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setSearchOpen(true)}
                  >
                    <LucideIcon.Search strokeWidth={2} />
                  </Button>
                )}
                {filterMenu}
              </>
            )}
            {/* An invisible twin of the pane toggle, holding its place. The real one
                          is pinned to the screen's top-right corner so that collapsing the pane
                          takes it out from under a button that never moves — which also means
                          nothing in the pane knows it's there, and search, filter and the
                          Analytics tab all ran straight under it.

                          The same component rather than a sized box, so the space can't drift
                          from the thing standing in it. aria-hidden and out of the tab order:
                          the real button carries both. */}
            <Button
              className="invisible"
              size="icon"
              tabIndex={-1}
              type="button"
              variant="ghost"
              aria-hidden
            >
              <LucideIcon.PanelRight strokeWidth={2} />
            </Button>
          </ViewBar.Actions>
        </ViewBar>
        <TabsContent className="min-h-0 flex-1 overflow-y-auto" value="settings">
          <SettingsPanel {...settings} />
        </TabsContent>
        <TabsContent className="flex min-h-0 flex-1 flex-col" value="analytics">
          {/* What's narrowing the list, stated below the controls rather than hidden
                    inside the funnel that set it — the members page's row, and the reason the
                    funnel needs no active state of its own.
                    
                    "All time" is the default, so it isn't a filter and doesn't earn a chip.
                    Status and exit reason share one chip: choosing a reason sets the status
                    with it, so two chips would be one fact stated twice. */}
          {(range !== 'all' || statusFilter || exitFilter) && (
            <FilterBar className={cn('shrink-0 pb-3', gutter)}>
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

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            {/* Chart + counts. Scrolls away under the sticky bar below.
                  pb-8 holds them off what follows. It was pb-4, which was sized for a
                  boundary that no longer exists: the sticky bar below collapses to
                  nothing until it sticks, so at rest the count cards ran almost straight
                  into the table and the two blocks read as one long list of numbers. The
                  Members heading below now marks where the summary ends and the roster
                  begins, and this is the air that lets it do that.
                  pt-0: the strip above already ends in pb-3, and its own top padding
                  on top of that held the chart too far off the Performance label. */}
            <div className={cn('flex flex-col pt-0 pb-8', gutter)}>
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

              {/* Three counts in a row. They both report and filter, and sit above the
                      sticky bar so they scroll away as it sticks — the table then always lands
                      directly beneath the bar.
                      
                      They go with the summary in find mode. Reporting is the half of their job
                      that find mode is putting away, and the filtering half is on the row above
                      by then — a card and a menu setting the same status, four inches apart,
                      is two controls for one value. */}
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
                          {facet.mark}
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
                            {facet.mark}
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

              {/* Member table. table-fixed keeps the Entered/Status widths steady. */}
              <div className={cn('pb-6', gutter)}>
                {/* The one section heading in this panel. Everything above it answers
                          "how is this automation doing"; everything below it is WHO — and
                          without a word between them the roster read as one more block of
                          summary rather than as the list you can search, sort and open.

                          "Members", not "Runs": the rows are people, the column is their
                          name, and clicking one opens that person's run on the canvas. Runs
                          is the model's word for it, not the reader's.

                          Text with as="h3" rather than Shade's H3, which is deprecated in
                          favour of Text composition. size="md" (14px) sits a step under the
                          screen title's text-lg — a heading inside a panel, not a second
                          title competing with the automation's own. */}
                <Text as="h3" className="pb-3" size="md" weight="semibold">
                  Members
                </Text>
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
                          {/* w-10 and no horizontal padding: the dot centres in a column
                                    just wide enough to hold it, so the member names still start
                                    near the pane's own gutter rather than indented behind a
                                    column of mostly air. */}
                          <TableCell
                            className="w-10 px-0 py-4 text-center align-middle group-hover:bg-transparent"
                            title={
                              runFailed(run) ? `${status} — ${exitReasonLabel('failed')}` : status
                            }
                          >
                            <StatusMark run={run} status={status} />
                          </TableCell>
                          <TableCell className="min-w-0 py-4 pr-4 pl-0 group-hover:bg-transparent">
                            <span
                              className={`block min-w-0 truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}
                            >
                              {run.member.name}
                            </span>
                          </TableCell>
                          {/* The bare relative time — "3 days ago", "Yesterday". It briefly
                                    read "Entered 3 days ago", which said the same word down every
                                    row to answer a question asked once.

                                    Unlabelled works because there is exactly one date per row and
                                    one event a row can represent: a run is a member entering. A
                                    trailing muted timestamp is also the convention for activity
                                    lists everywhere, so it reads as "when this happened" without
                                    being told.

                                    Muted: this is the row's least important fact — you read the
                                    name, then the dot, and the date only if you're already
                                    interested — so it recedes rather than lining up at full
                                    strength beside the name. */}
                          <TableCell className="w-28 p-4 align-middle group-hover:bg-transparent">
                            <span className="block truncate text-base text-muted-foreground">
                              {startedLabel(run.enrolled_at)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
