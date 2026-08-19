import React, {useEffect, useMemo, useState} from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, InputGroup, InputGroupAddon, InputGroupInput, MetricValue, Table, TableBody, TableCell, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {FilterBar, GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun} from '@/automations/proto/shared/mock';
import type {LeftPanelProps} from './types';
import {CompletedGlyph, ExitedGlyph, InProgressGlyph} from '@/automations/proto/shared/run-glyphs';
import {SortHead, type SortState} from '@/automations/proto/float/sort-head';
import {startedLabel} from '@/automations/proto/shared/member-runs';
import {toAreaData} from '@/automations/proto/shared/chart';
import {useStickyList} from '@/automations/proto/float/use-sticky-list';

// Variant B of the float concept's left pane. Same scroll behaviour as variant A
// (search + filters roll up into a sticky bar as the cards scroll off), but with
// a simpler read of the data:
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
//
// Variant C (variant-c.tsx) renders this same panel with `statusLeads` — the
// status icon moves in front of the member name under a blank (but still
// sortable) header. One base rather than a forked file, so the two variants can
// only differ in the one thing they're comparing.

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

// A run that ended on a system fault (a failed delivery) escalates its row icon
// to a red alert — the one list state that's the publisher's to fix, so the one
// allowed to call attention. It still counts and filters as Exited early; the
// facet cards stay aggregate, only the member's own row raises its hand.
const runFailed = (run: AutomationRun): boolean => run.steps.some(step => step.failed);

const rowGlyph = (status: StatusKey, run: AutomationRun): React.ReactNode => (
    runFailed(run) ? <LucideIcon.CircleAlert className="size-4 shrink-0" strokeWidth={2} /> : facetGlyph(status)
);

const rowColor = (status: StatusKey, run: AutomationRun): string => (
    runFailed(run) ? 'text-red-600 dark:text-red' : facetColor(status)
);

const RANGE_OPTIONS: {value: string; label: string}[] = [
    {value: 'all', label: 'All time'},
    {value: '7', label: 'Last 7 days'},
    {value: '30', label: 'Last 30 days'},
    {value: '90', label: 'Last 90 days'}
];

type EnrichedRun = {run: AutomationRun; status: StatusKey};

// The one appended phrase in the status-leads layout: early exits carry their
// reason after the name, lowercased so it continues the sentence ("Priya Nair
// unsubscribed"). In-progress and completed rows stay bare — their glyphs are
// self-explanatory, and the reason is the only text that adds something the icon
// can't say. (Both a full labelled status column and suffixes on every row were
// tried on the way here; one duplicated the glyph in words, the other made
// every row talk.)
const exitSuffix = (status: StatusKey, run: AutomationRun): string | null => {
    if (status !== 'Exited early') {
        return null;
    }
    const reason = run.exit_reason ?? 'Exited early';
    return reason.charAt(0).toLowerCase() + reason.slice(1);
};

export const LeftPanelBase: React.FC<LeftPanelProps & {statusLeads?: boolean}> = ({scenario, selectedMemberId, onSelectMember, onSearchOpenChange, onCollapse, headerDocked = false, statusLeads = false}) => {
    const {automation, metrics, runs} = scenario;
    const [range, setRange] = useState('all');
    const [query, setQuery] = useState('');
    // Search starts collapsed to an icon (the timeframe earns the space more
    // often); opening it takes over the header row rather than adding a second
    // control the eye has to skip.
    const [searchOpen, setSearchOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusKey | null>(null);
    // Opening search takes over the top strip, so the screen needs to know to get
    // the automation title out of the way.
    const toggleSearch = (open: boolean) => {
        setSearchOpen(open);
        onSearchOpenChange?.(open);
    };
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

    // Counts follow the search but NOT the active status, so every card keeps
    // showing what it would select.
    const counts = useMemo(() => {
        const tally: Record<string, number> = {};
        searched.forEach(({status}) => {
            tally[status] = (tally[status] ?? 0) + 1;
        });
        return tally;
    }, [searched]);

    const sorted = useMemo(() => {
        const rows = statusFilter ? searched.filter(row => row.status === statusFilter) : [...searched];
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
    }, [searched, statusFilter, sort]);

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
                className={cn(
                    'shrink-0 pt-4 pr-6 pb-3',
                    // Open search takes the whole strip, so it indents past the back
                    // arrow rather than sitting under it — the exit stays reachable
                    // while the title behind it is hidden. Docked, the arrow is up in
                    // the bar, so there's nothing to clear.
                    searchOpen && !headerDocked ? 'pl-16' : 'pl-6'
                )}
                gap="sm"
                justify={headerDocked && !searchOpen ? 'between' : 'end'}
            >
                {/* Named only when the pane is a region of its own. Under floating
                    chrome the automation's title is the only title on screen, and a
                    second one competing with it made the strip read as two headers. */}
                {headerDocked && !searchOpen && (
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
                            autoFocus
                            placeholder="Search members…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </InputGroup>
                )}
                {/* The icon buttons sit flush against each other — each already carries
                    its own padding, so a gap on top of that spaced them twice and the
                    row read as three unrelated controls instead of one toolbar. The
                    outer gap still holds, which is what keeps them off the search
                    field's border when it's open. */}
                <Inline align="center" className="shrink-0" gap="none">
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
                        action reads the same way everywhere it appears. FunnelPlus once a
                        filter's applied is the members page's own convention too. */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-label="Filter" className={cn(range !== 'all' && 'bg-muted')} size="icon" type="button" variant="ghost">
                                {range !== 'all' ? <LucideIcon.FunnelPlus strokeWidth={2} /> : <LucideIcon.Funnel strokeWidth={2} />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Entered</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={range} onValueChange={setRange}>
                                {RANGE_OPTIONS.map(option => (
                                    <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
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
            {range !== 'all' && (
                <FilterBar className="shrink-0 px-6 pb-3">
                    <Button size="sm" type="button" variant="outline" onClick={() => setRange('all')}>
                        Entered: {rangeLabel}
                        <LucideIcon.X className="size-3.5" strokeWidth={2} />
                    </Button>
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
            <div className="flex flex-col gap-4 px-6 pt-0 pb-4">
                <Box className="rounded-lg border border-border-default px-4 py-3">
                    <Stack gap="sm">
                        <MetricValue
                            label={(
                                <>
                                    <LucideIcon.Zap size={16} strokeWidth={1.5} />
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
                                    active ? 'border-foreground bg-muted-foreground/10' : 'border-border-default hover:bg-muted-foreground/5'
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
                {/* No border-b when stuck: the table header directly beneath draws
                    its own bottom rule, and a rule above it as well boxed the header
                    in between two lines. */}
                <div ref={stickyBarRef} className={cn('sticky top-0 z-20 bg-surface-elevated px-6', stuck && 'pb-4')}>
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
                                                active ? 'border-foreground bg-muted-foreground/10' : 'border-border-default hover:bg-muted-foreground/5'
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
                                {/* Status leading: the icon is the first thing in every
                                    row, so grouping rows by it is what clicking this
                                    header visibly does — the Member header sorts by
                                    STATUS, with name as the tie-break inside each group. */}
                                <SortHead label="Member" onSort={onSort} sort={sort} sortKey={statusLeads ? 'status' : 'member'} />
                                <SortHead className="w-24" label="Entered" onSort={onSort} sort={sort} sortKey="entered" />
                                {!statusLeads && <SortHead className="w-20" label="Status" onSort={onSort} sort={sort} sortKey="status" />}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell className="py-6 text-center text-sm text-muted-foreground" colSpan={statusLeads ? 2 : 3}>No members match.</TableCell>
                                </TableRow>
                            )}
                            {sorted.map(({run, status}) => {
                                const isSelected = run.id === selectedMemberId;
                                return (
                                    <TableRow
                                        key={run.id}
                                        aria-selected={isSelected}
                                        // Plain grey selection. A rounded blue ring was tried via a
                                        // tr::before overlay (radius doesn't work on collapsed table
                                        // rows directly) and broke row layout — positioned table rows
                                        // aren't dependable. The canvas's blue review ring carries the
                                        // "you're in this member's run" signal on its own.
                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-muted-foreground/10' : 'hover:bg-muted-foreground/5'}`}
                                        // Toggle: clicking the selected row again de-selects it.
                                        onClick={() => onSelectMember(isSelected ? null : run.id)}
                                    >
                                        <TableCell className="min-w-0 px-4 py-4 group-hover:bg-transparent">
                                            {statusLeads ? (
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span className={cn('shrink-0', rowColor(status, run))} title={status}>{rowGlyph(status, run)}</span>
                                                    {/* One truncating span so a long name + reason
                                                        clips as a unit. The reason drops to muted —
                                                        with most rows bare, the few that speak don't
                                                        need full-strength text to be found, and muted
                                                        keeps the name column reading as names. */}
                                                    <span className="min-w-0 truncate text-base">
                                                        <span className="font-semibold">{run.member.name}</span>
                                                        {exitSuffix(status, run) && <span className="text-muted-foreground"> {exitSuffix(status, run)}</span>}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className={`block min-w-0 truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}>{run.member.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="w-24 px-4 py-4 align-middle group-hover:bg-transparent">
                                            {/* Matches panels.tsx — same size and colour as
                                                the member column, weight alone separating
                                                them. Kept in step so the two left-pane
                                                variants differ only where they mean to. */}
                                            <span className="block truncate text-base">{startedLabel(run.enrolled_at)}</span>
                                        </TableCell>
                                        {!statusLeads && (
                                            <TableCell className="w-20 px-4 py-4 text-center align-middle group-hover:bg-transparent">
                                                {/* Icon only — the cards above name each state. */}
                                                <div className={cn('flex justify-center', rowColor(status, run))} title={status}>
                                                    {rowGlyph(status, run)}
                                                </div>
                                            </TableCell>
                                        )}
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

// Variant B proper: the trailing status column, as reviewed so far.
export const LeftPanelVariantB: React.FC<LeftPanelProps> = props => <LeftPanelBase {...props} />;
