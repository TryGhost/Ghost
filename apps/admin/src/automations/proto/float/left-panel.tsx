import React, {useEffect, useMemo, useState} from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, InputGroup, InputGroupAddon, InputGroupInput, MetricValue, Table, TableBody, TableCell, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {FilterBar, GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun, ExitReason} from '@/automations/proto/shared/mock';
import type {LeftPanelProps} from './left-panel-types';
import {CompletedGlyph, ExitedGlyph, InProgressGlyph} from '@/automations/proto/shared/run-glyphs';
import {SortHead, type SortState} from '@/automations/proto/float/sort-head';
import {EXIT_REASONS, exitReasonLabel, runFailed, startedLabel} from '@/automations/proto/shared/member-runs';
import {toAreaData} from '@/automations/proto/shared/chart';
import {useStickyList} from '@/automations/proto/float/use-sticky-list';

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
const STATUS_FACETS: {key: StatusKey; color: string; glyph: React.ReactNode}[] = [
    {key: 'In progress', color: 'text-blue-600 dark:text-blue', glyph: <InProgressGlyph />},
    {key: 'Completed', color: 'text-green-600 dark:text-green', glyph: <CompletedGlyph />},
    {key: 'Exited early', color: 'text-muted-foreground', glyph: <ExitedGlyph />}
];

const facetColor = (status: StatusKey): string => STATUS_FACETS.find(facet => facet.key === status)?.color ?? '';
const facetGlyph = (status: StatusKey): React.ReactNode => STATUS_FACETS.find(facet => facet.key === status)?.glyph ?? null;

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

const RANGE_OPTIONS: {value: string; label: string}[] = [
    {value: 'all', label: 'All time'},
    {value: '7', label: 'Last 7 days'},
    {value: '30', label: 'Last 30 days'},
    {value: '90', label: 'Last 90 days'}
];

type EnrichedRun = {run: AutomationRun; status: StatusKey};

export const LeftPanel: React.FC<LeftPanelProps> = ({scenario, selectedMemberId, onSelectMember, onCollapse}) => {
    const {automation, metrics, runs} = scenario;
    const [range, setRange] = useState('all');
    const [query, setQuery] = useState('');
    // Search starts collapsed to an icon (the timeframe earns the space more
    // often); opening it takes over the header row rather than adding a second
    // control the eye has to skip.
    const [searchOpen, setSearchOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusKey | null>(null);
    // Why someone left, filtered separately from the status. Deliberately not a
    // fourth status card: the three statuses are mutually exclusive outcomes, and
    // a failure is a REASON for exiting rather than a different kind of exit.
    // Selecting one implies Exited early, so it doesn't need the card as well.
    const [exitFilter, setExitFilter] = useState<ExitReason | null>(null);
    // Opening search takes over the top strip, so the screen needs to know to get
    // the automation title out of the way.
    const toggleSearch = (open: boolean) => {
        setSearchOpen(open);
    };
    // The summary (Total entries + chart) answers "how many are entering, over
    // time", and only the timeframe changes that. Searching or filtering by exit
    // reason narrows the list beneath it and leaves it untouched — so while either
    // is active it would sit there contradicting the controls above it. It rolls
    // away instead, and comes back the moment they clear.
    const summaryHidden = Boolean(exitFilter) || query.trim().length > 0;

    // Newest first: the question this table answers is "who's in here now".
    const [sort, setSort] = useState<SortState<SortKey>>({key: 'entered', direction: 'desc'});
    const {scrollRef, sentinelRef, stickyBlockRef, stickyBarRef, stuck} = useStickyList();

    const chartData = toAreaData(metrics.enrollments_by_day, {
        range: range === 'all' ? undefined : Number(range),
        label: 'Entries'
    });
    const chartMax = Math.max(...chartData.map(point => point.value), 1);
    const rangeLabel = RANGE_OPTIONS.find(option => option.value === range)?.label ?? 'All time';

    // All time reports the automation's own total, so it matches the number on the
    // automations list exactly; narrower ranges are summed from the visible series.
    const totalEntries = range === 'all'
        ? metrics.enrollments
        : chartData.reduce((sum, point) => sum + point.value, 0);

    const onSort = (key: SortKey) => setSort(prev => (
        prev.key === key
            ? {key, direction: prev.direction === 'asc' ? 'desc' : 'asc'}
            : {key, direction: key === 'entered' ? 'desc' : 'asc'}
    ));

    // Search narrows everything; enrich once so the counts, the filter and the
    // rendered rows can't disagree about a run's status.
    const searched = useMemo<EnrichedRun[]>(() => {
        const q = query.trim().toLowerCase();
        return runs
            .filter(run => run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q))
            .map(run => ({run, status: statusOf(run)}));
    }, [runs, query]);

    // Counts follow the search and the exit-reason filter, but NOT the active
    // status — so every card keeps showing exactly what selecting IT would give.
    // Skipping the status is what lets the cards stay comparable; honouring the
    // exit reason is what keeps a card's number from promising rows the filter
    // would then hide.
    const counts = useMemo(() => {
        const tally: Record<string, number> = {};
        searched
            .filter(({run}) => !exitFilter || run.exit_reason === exitFilter)
            .forEach(({status}) => {
                tally[status] = (tally[status] ?? 0) + 1;
            });
        return tally;
    }, [searched, exitFilter]);

    const sorted = useMemo(() => {
        const byStatus = statusFilter ? searched.filter(row => row.status === statusFilter) : [...searched];
        const rows = exitFilter ? byStatus.filter(row => row.run.exit_reason === exitFilter) : byStatus;
        const order: StatusKey[] = ['In progress', 'Completed', 'Exited early'];
        rows.sort((a, b) => {
            // enrolled_at is ISO 8601, so a lexical compare is chronological.
            const cmp = sort.key === 'status'
                ? (order.indexOf(a.status) - order.indexOf(b.status)) || a.run.member.name.localeCompare(b.run.member.name)
                : sort.key === 'entered'
                    ? a.run.enrolled_at.localeCompare(b.run.enrolled_at)
                    : a.run.member.name.localeCompare(b.run.member.name);
            return sort.direction === 'asc' ? cmp : -cmp;
        });
        return rows;
    }, [searched, statusFilter, exitFilter, sort]);

    // If a filter or the search hides the selected member, de-select them — the
    // canvas shouldn't keep highlighting someone who's no longer in the list.
    useEffect(() => {
        if (selectedMemberId && !sorted.some(row => row.run.id === selectedMemberId)) {
            onSelectMember(null);
        }
    }, [sorted, selectedMemberId, onSelectMember]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Floating chrome: the controls sit in the screen's top strip, on the
                same baseline as the back arrow and title floating to their left, so the
                top of the screen reads as one row rather than starting again below it.

                Docked header: there is no strip to borrow — the bar above already owns
                that row — so the pane titles itself and keeps its controls on its own
                baseline. Outside the scroll container either way, so they stay put. */}
            <Inline
                align="center"
                className="shrink-0 px-6 pt-4 pb-3"
                gap="sm"
                justify={searchOpen ? 'end' : 'between'}
            >
                {/* The pane is a region of its own under the header bar, so it says
                    what it is. */}
                {!searchOpen && (
                    <Text size="lg" weight="semibold">Performance</Text>
                )}
                {/* flex-1 + min-w-0, NOT w-full: w-full resolves against the whole
                    strip, overflows it once the gap and buttons are counted, and flex
                    resolves that by shrinking the siblings — so the icon buttons squash
                    below 36px and appear to jump width as search opens. */}
                {searchOpen && (
                    <InputGroup className="min-w-0 flex-1">
                        <InputGroupAddon>
                            <LucideIcon.Search />
                        </InputGroupAddon>
                        <InputGroupInput
                            placeholder="Search members…"
                            value={query}
                            autoFocus
                            onChange={e => setQuery(e.target.value)}
                        />
                    </InputGroup>
                )}
                {/* Same 8px the header bar puts between its own buttons, so every
                    button row on the screen is spaced alike. (These sat flush for a
                    while, on the reasoning that each button's own padding was already
                    separating them and a gap spaced them twice — matching the header
                    won out.) */}
                <Inline align="center" className="shrink-0" gap="sm">
                    {searchOpen ? (
                        <Button
                            aria-label="Close search"
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setQuery('');
                                toggleSearch(false);
                            }}
                        >
                            <LucideIcon.X strokeWidth={2} />
                        </Button>
                    ) : (
                        <Button aria-label="Search members" size="icon" type="button" variant="ghost" onClick={() => toggleSearch(true)}>
                            <LucideIcon.Search strokeWidth={2} />
                        </Button>
                    )}
                    {/* A plain filter button rather than a labelled timeframe control: the
                        timeframe is one of several things we'll want to filter on, and this
                        is the affordance the rest of Ghost already uses — the funnel from
                        the members page filter bar, not a generic sliders icon, so the same
                        action reads the same way everywhere it appears.

                        One funnel, no active state: the icon names the action and
                        nothing more. An applied filter is already stated — and made
                        removable — by its chip in the row below, so tinting the button
                        as well said the same thing twice in a place you can't act on. */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-label="Filter" size="icon" type="button" variant="ghost">
                                <LucideIcon.Funnel strokeWidth={2} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Entries</DropdownMenuLabel>
                            {/* Trailing check, not the radio bullet: Shade's active-option
                                convention (the Filters pattern's option rows, SelectItem) puts
                                a check at the end of the row. Opacity rather than conditional
                                render so rows keep a stable width. */}
                            {RANGE_OPTIONS.map(option => (
                                <DropdownMenuItem key={option.value} onSelect={() => setRange(option.value)}>
                                    {option.label}
                                    <LucideIcon.Check className={cn('ms-auto text-primary', range === option.value ? 'opacity-100' : 'opacity-0')} />
                                </DropdownMenuItem>
                            ))}
                            {/* Exit reason lives here rather than as a fourth status
                                card. The cards are lifecycle outcomes and stay three;
                                this asks a different question — why someone left —
                                and only of the ones who did. Selecting a reason is
                                what "show me failures" means. */}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Exit reason</DropdownMenuLabel>
                            {EXIT_REASONS.map(reason => (
                                <DropdownMenuItem key={reason.id} onSelect={() => setExitFilter(exitFilter === reason.id ? null : reason.id)}>
                                    {reason.label}
                                    <LucideIcon.Check className={cn('ms-auto text-primary', exitFilter === reason.id ? 'opacity-100' : 'opacity-0')} />
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Last in the row, past the filter. It hides this pane, so it lives
                        in it — a control on the thing it acts on. X, not a panel glyph:
                        open, the button's job is dismissal, and the chart icon it
                        reopens with already names what comes back. */}
                    {onCollapse && (
                        <Button aria-label="Hide performance" size="icon" type="button" variant="ghost" onClick={onCollapse}>
                            <LucideIcon.X strokeWidth={2} />
                        </Button>
                    )}
                </Inline>
            </Inline>

            {/* An applied filter gets its own row beneath the controls, the way the
                members page does it — so what's narrowing the list is always visible
                rather than hidden inside the button that set it. "All time" is the
                default, so it isn't a filter and doesn't earn a row. */}
            {(range !== 'all' || exitFilter) && (
                <FilterBar className="shrink-0 px-6 pb-3">
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
                        {range !== 'all' && (
                            <Button type="button" variant="outline" onClick={() => setRange('all')}>
                                {rangeLabel}
                                <LucideIcon.X strokeWidth={2} />
                            </Button>
                        )}
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
            <div className="flex flex-col px-6 pt-0 pb-4">
                {/* Collapses on a grid-rows 0fr→1fr, the same technique the sticky
                    bar below uses to roll its chips in — one idiom for "this region
                    folds away" rather than two. The mb-4 rides inside the collapsing
                    element on purpose: as a gap on the flex parent it would survive
                    the collapse and leave 16px of nothing above the cards. */}
                <div className={cn('grid transition-[grid-template-rows,opacity] duration-200 ease-out', summaryHidden ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}>
                    <div className="overflow-hidden">
                <Box className="mb-4 rounded-lg border border-border-default px-4 py-3">
                    <Stack gap="sm">
                        <MetricValue
                            label={(
                                <>
                                    {/* Matches the shipping KPI for a member count
                                        (posts/analytics/growth labels "Free members"
                                        with the same icon and weight). Zap was the
                                        trigger's icon, not this metric's — what's
                                        counted here is people, not firings. */}
                                    <LucideIcon.User size={16} strokeWidth={1.5} />
                                    Total entries
                                </>
                            )}
                            value={formatNumber(totalEntries)}
                        />
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
                                    active ? 'border-foreground bg-muted-foreground/10' : 'border-border-default hover:bg-interactive-hover'
                                )}
                                type="button"
                                onClick={() => setStatusFilter(active ? null : facet.key)}
                            >
                                <MetricValue
                                    label={(
                                        <>
                                            <span className={facet.color}>{facet.glyph}</span>
                                            {facet.key}
                                        </>
                                    )}
                                    value={formatNumber(counts[facet.key] ?? 0)}
                                />
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
                <div ref={stickyBarRef} className={cn('sticky top-0 z-20 bg-surface-elevated px-6', stuck && 'border-b border-border-default pb-4')}>
                    <div className={cn('grid transition-[grid-template-rows,opacity] duration-200 ease-out', stuck ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
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
                                                active ? 'border-foreground bg-muted-foreground/10' : 'border-border-default hover:bg-interactive-hover'
                                            )}
                                            title={facet.key}
                                            type="button"
                                            onClick={() => setStatusFilter(active ? null : facet.key)}
                                        >
                                            <span className={facet.color}>{facet.glyph}</span>
                                            {/* Selected lifts the count to full text colour — the border and
                                                fill mark the chip, but keeping its number muted made the
                                                active filter look no more current than the idle ones. */}
                                            <span className={cn('tabular-nums', active ? 'text-foreground' : 'text-muted-foreground')}>{formatNumber(counts[facet.key] ?? 0)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Member table. table-fixed keeps the Entered/Status widths steady. */}
                <div className="px-6 pb-6">
                    <Table className="table-fixed" data-testid="float-entries-table">
                        {/* border-b-0 on both: Shade gives thead and its row a bottom
                            border, but this header's single rule is the SortHead cells'
                            inset shadow (a border wouldn't travel when they stick) — left
                            on, the two lines doubled up at rest. */}
                        <TableHeader className="border-b-0">
                            <TableRow className="border-b-0 hover:bg-transparent">
                                <SortHead label="Member" sort={sort} sortKey="member" onSort={onSort} />
                                <SortHead className="w-24" label="Entered" sort={sort} sortKey="entered" onSort={onSort} />
                                <SortHead className="w-20" label="Status" sort={sort} sortKey="status" onSort={onSort} />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell className="py-6 text-center text-sm text-muted-foreground" colSpan={3}>No members match.</TableCell>
                                </TableRow>
                            )}
                            {sorted.map(({run, status}) => {
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
                                            <span className={`block min-w-0 truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}>{run.member.name}</span>
                                        </TableCell>
                                        <TableCell className="w-24 p-4 align-middle group-hover:bg-transparent">
                                            <span className="block truncate text-base">{startedLabel(run.enrolled_at)}</span>
                                        </TableCell>
                                        <TableCell className="w-20 p-4 text-center align-middle group-hover:bg-transparent">
                                            {/* Icon only — the cards above name each state.
                                                The title is the one place the exit reason
                                                surfaces in the table, and only for failures,
                                                where the dot has raised a question the row
                                                otherwise can't answer. */}
                                            <div
                                                className={cn('flex justify-center', facetColor(status))}
                                                title={runFailed(run) ? `${status} — ${exitReasonLabel('failed')}` : status}
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
