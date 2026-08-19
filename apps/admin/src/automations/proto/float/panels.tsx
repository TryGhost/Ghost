import React, {useEffect, useMemo, useState} from 'react';
import {Button, InputGroup, InputGroupAddon, InputGroupInput, MetricValue, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun, AutomationScenario} from '@/automations/proto/shared/mock';
import {toAreaData} from '@/automations/proto/shared/chart';
import {SortHead, type SortState} from '@/automations/proto/float/sort-head';
import {CompletedGlyph} from '@/automations/proto/shared/run-glyphs';
import {startedLabel} from '@/automations/proto/shared/member-runs';
import {useStickyList} from '@/automations/proto/float/use-sticky-list';

// Content for the float concept's persistent left card — one "Performance" view
// (adapted from the surface concept's SurfaceAnalyticsPane). The review collapsed
// the separate Overview + Runs sections and their toolbar toggles into a single
// docked card: a total-runs chart, a full-width member search, a 2x2 grid of
// status cards that both count and filter, then the runs table. The cards replace
// the old metric tiles + quick-filter chips — they show run-derived counts (the
// only place the Upgraded/Unsubscribed split exists) and clicking one filters the
// table. First pass: no loading skeletons yet — worth adding if this concept sticks.

const CHART_HEIGHT = 'h-56';

// --- Float-local run row presentation --------------------------------------
// The dashboard/surface concepts describe a run with the shared runProgress
// text ("45% complete - Upgraded to paid") + shared StatusPill (In progress /
// Completed / Exited early). This concept simplifies the row to two things: a
// short status label (where the member is now, or how they left) with a slim
// progress bar under it. All of it is local to float — the shared helpers stay
// exactly as the other concepts use them.

const runPercent = (run: AutomationRun): number => {
    // Running: proto-only synthetic spread across ~10–90%, keyed on run id so it's
    // stable and the rings vary + sort. A real build would derive this from
    // completed steps + how far through the current wait the member is (the raw
    // step count below is too coarse, and every in-progress fixture is early).
    if (run.status === 'in_progress') {
        const hash = [...run.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        return 10 + (hash % 81);
    }
    const total = run.steps.length;
    const done = run.steps.filter(step => step.state === 'done').length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
};

// Status label is derived, not a fixed enum: completed → Done, in-progress →
// Running, exited → Unsubscribed/Upgraded. (Labels here are still a first pass —
// the exact wording is being worked out.)
const runStatusLabel = (run: AutomationRun): string => {
    if (run.status === 'completed') {
        return 'Done';
    }
    if (run.status === 'exited_early') {
        if ((run.exit_reason ?? '').toLowerCase().includes('upgrad')) {
            return 'Upgraded';
        }
        // Fixture data gives every exited run in an automation the same reason;
        // deterministically flip a third of them to "Upgraded" so the list reads
        // as a realistic mix. Keyed on run id so it's stable across renders —
        // prototype-only; the real feature reads the run's actual exit reason.
        const hash = [...run.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        return hash % 3 === 0 ? 'Upgraded' : 'Unsubscribed';
    }
    return 'Running';
};

// Progress ring — only in-progress runs use it (their fill is the live
// measure). The arc inherits currentColor from the status cell; the track is a
// faint version of it.
const ProgressRing: React.FC<{value: number}> = ({value}) => {
    const radius = 7;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);
    return (
        <svg className="size-[18px] shrink-0 -rotate-90" fill="none" viewBox="0 0 18 18">
            <circle className="stroke-muted-foreground/30" cx="9" cy="9" r={radius} strokeWidth="1.5" />
            <circle className="stroke-current" cx="9" cy="9" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="1.5" />
        </svg>
    );
};

// Status glyph: the ring for in-progress (fills with runPercent), otherwise a
// fixed outcome icon. Icon inherits the row's status colour via currentColor.
const StatusGlyph: React.FC<{run: AutomationRun; label: string; pct: number}> = ({run, label, pct}) => {
    if (run.status === 'in_progress') {
        return <ProgressRing value={pct} />;
    }
    // Done takes the shared completed glyph so it matches the canvas. Upgraded and
    // Unsubscribed stay on Lucide — they're this variant's own split of "exited
    // early", and the shared set only draws the three states everything else uses.
    if (label !== 'Upgraded' && label !== 'Unsubscribed') {
        return <CompletedGlyph className="size-[18px]" />;
    }
    const Icon = label === 'Upgraded' ? LucideIcon.ChevronsUp : LucideIcon.CircleMinus;
    return <Icon className="size-[18px] shrink-0" strokeWidth={1.5} />;
};

// The four derived statuses, each with the same glyph + colour the table's
// Status column uses — so the count/filter cards read as the same thing as the
// column. Running shows a fixed ~50% ring just to convey the shape.
//
// -600 in light, the plain alias (-500) in dark. The palette is absolute — it
// doesn't flip per mode — so a bare `text-green` is the same value on a white
// pane as on a dark one, which is far too pale in light. These are unbacked
// glyphs sitting straight on the surface, so they stop at -600; the -800 the
// run badges use is tuned for text on a pastel /20 tint and reads heavy here.
const STATUS_FACETS: {label: string; color: string; glyph: React.ReactNode}[] = [
    {label: 'Running', color: 'text-blue-600 dark:text-blue', glyph: <ProgressRing value={50} />},
    {label: 'Upgraded', color: 'text-green-600 dark:text-green', glyph: <LucideIcon.ChevronsUp strokeWidth={1.5} />},
    {label: 'Unsubscribed', color: 'text-yellow-600 dark:text-yellow', glyph: <LucideIcon.CircleMinus strokeWidth={1.5} />},
    {label: 'Done', color: 'text-muted-foreground', glyph: <CompletedGlyph className="size-[18px]" />}
];

type SortKey = 'member' | 'started' | 'status';

// One enriched row, so the status label / percent are computed once and reused
// by the facet counts, the sort comparator, and the rendered row.
type SortedRun = {run: AutomationRun; label: string; pct: number};

interface CanvasSidePanelProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    onSelectMember: (runId: string | null) => void;
    // Collapses the pane; absent when the editing model can't hide it, which is
    // what tells this variant not to render the toggle. See panel-variants/types.
    onCollapse?: () => void;
    // The screen's chrome is a docked bar, so the pane titles itself. See
    // panel-variants/types.
    headerDocked?: boolean;
}

// The float concept's persistent left card: a single "Performance" view — total-
// runs chart, member search, the 2x2 status cards (count + filter), and the runs
// table. Replaces the old Overview/Runs rail flyouts.
export const CanvasSidePanel: React.FC<CanvasSidePanelProps> = ({scenario, selectedMemberId, onSelectMember, onCollapse, headerDocked = false}) => {
    const {automation, metrics, runs} = scenario;
    const [range, setRange] = useState('30');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [sort, setSort] = useState<SortState<SortKey>>({key: 'member', direction: 'asc'});
    const {scrollRef, sentinelRef, stickyBlockRef, stickyBarRef, stuck} = useStickyList();

    const chartData = toAreaData(metrics.enrollments_by_day, {range: Number(range), label: 'Runs'});
    const chartMax = Math.max(...chartData.map(point => point.value), 1);

    // Clicking a column sorts by it ascending; clicking the active column flips
    // the direction.
    const onSort = (key: SortKey) => setSort(prev => (
        prev.key === key
            ? {key, direction: prev.direction === 'asc' ? 'desc' : 'asc'}
            : {key, direction: 'asc'}
    ));

    // Search narrows the whole list; enrich once (status label + percent) so the
    // card counts, the filter, and the rendered rows all agree.
    const searched = useMemo<SortedRun[]>(() => {
        const q = query.trim().toLowerCase();
        return runs
            .filter(run => run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q))
            .map(run => ({run, label: runStatusLabel(run), pct: runPercent(run)}));
    }, [runs, query]);

    // Facet counts reflect the search but NOT the active card, so every card keeps
    // its count and you can switch between them. Run-derived: the four-way split
    // (esp. Upgraded/Unsubscribed) only exists per-run, so the counts match the
    // rows a card filters to exactly.
    const counts = useMemo(() => {
        const map: Record<string, number> = {};
        for (const row of searched) {
            map[row.label] = (map[row.label] ?? 0) + 1;
        }
        return map;
    }, [searched]);

    const sorted = useMemo<SortedRun[]>(() => {
        const rows = searched.filter(row => !statusFilter || row.label === statusFilter);
        rows.sort((a, b) => {
            // Status sorts by progress % (so the rings order by fill), then by
            // label to keep same-percent rows grouped. enrolled_at is ISO 8601, so
            // a lexical compare is chronological.
            const cmp = sort.key === 'status'
                ? (a.pct - b.pct) || a.label.localeCompare(b.label)
                : sort.key === 'started'
                    ? a.run.enrolled_at.localeCompare(b.run.enrolled_at)
                    : a.run.member.name.localeCompare(b.run.member.name);
            return sort.direction === 'asc' ? cmp : -cmp;
        });
        return rows;
    }, [searched, statusFilter, sort]);

    // No member is selected by default — the canvas shows the read-only automation
    // until the user picks a row.

    // If a status card or the search hides the selected member, de-select them —
    // the canvas shouldn't keep highlighting a member who's no longer in the list.
    // Deliberately no auto-select of a replacement.
    useEffect(() => {
        if (selectedMemberId && !sorted.some(row => row.run.id === selectedMemberId)) {
            onSelectMember(null);
        }
    }, [sorted, selectedMemberId, onSelectMember]);

    return (
        // pt-16 clears the title overlay that floats at the screen's top-left; this
        // variant keeps all of its content below it.
        <div className="flex min-h-0 flex-1 flex-col pt-16">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            {/* Performance header + timeframe (drives the chart) + the chart itself.
                Scrolls away under the sticky search bar below. */}
            <div className="flex flex-col gap-4 px-6 pt-6">
                <Inline align="center" justify="between">
                    <span className="text-md font-semibold">Performance</span>
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-36 shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </Inline>

                <Box className="rounded-lg border border-border-default px-4 py-3">
                    <Stack gap="sm">
                        <MetricValue
                            label={(
                                <>
                                    <LucideIcon.Zap size={16} strokeWidth={1.5} />
                                    Total runs
                                </>
                            )}
                            value={formatNumber(metrics.enrollments)}
                        />
                        <GhAreaChart
                            className={`${CHART_HEIGHT} w-full`}
                            color="var(--chart-blue)"
                            data={chartData}
                            id={`float-runs-${automation.id}`}
                            range={chartData.length}
                            showYAxisValues={false}
                            yAxisRange={[0, chartMax]}
                        />
                    </Stack>
                </Box>

                {/* Count + filter cards, directly under the chart. They sit ABOVE the
                    sticky search bar, so they scroll away naturally as it sticks (no
                    collapse) and the table always lands right beneath the bar, no matter
                    how many facets there are. Single-select (re-click to clear); glyph/
                    colour mirror the table's Status column. */}
                <div className="grid grid-cols-2 gap-3">
                    {STATUS_FACETS.map((facet) => {
                        const active = statusFilter === facet.label;
                        return (
                            <button
                                key={facet.label}
                                aria-pressed={active}
                                className={cn(
                                    'rounded-lg border px-4 py-3 text-left transition-colors',
                                    active ? 'border-foreground bg-muted-foreground/10' : 'border-border-default hover:bg-muted-foreground/5'
                                )}
                                type="button"
                                onClick={() => setStatusFilter(active ? null : facet.label)}
                            >
                                <MetricValue
                                    label={(
                                        <>
                                            <span className={facet.color}>{facet.glyph}</span>
                                            {facet.label}
                                        </>
                                    )}
                                    value={formatNumber(counts[facet.label] ?? 0)}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* The instant this scrolls out the top, the search bar below has stuck. */}
            <div ref={sentinelRef} className="h-px" />

            {/* Reserves at least a viewport of height for the sticky bar + table (min-
                height set from JS above). When a filter shrinks the table, the scroll
                clamps to the top of THIS block (headers just under the sticky bar)
                rather than collapsing back past the sentinel and dropping the chips. */}
            <div ref={stickyBlockRef}>
                {/* Sticky control bar — search always; once stuck (the 2x2 cards have
                    scrolled off) a one-line chip row expands here in their place, via the
                    grid-rows 0fr→1fr height trick so the collapse animates. */}
                {/* No border-b when stuck — see variant-b: the table header below
                    draws the rule. */}
                <div ref={stickyBarRef} className="sticky top-0 z-20 bg-surface-elevated px-6 py-4">
                {/* Named only when the pane is a region of its own — under floating
                    chrome the automation's title is the only title on screen, and a
                    second one competing with it made the top read as two headers. */}
                {headerDocked && (
                    <Text className="pb-3" size="lg" weight="semibold">Performance</Text>
                )}
                {/* min-w-0 flex-1 on the input, not w-full: w-full resolves against the
                    whole bar and overflows it once the gap and the toggle are counted,
                    and flex resolves that by squashing the button below 36px. */}
                <Inline align="center" gap="sm">
                    <InputGroup className="min-w-0 flex-1">
                        <InputGroupAddon>
                            <LucideIcon.Search />
                        </InputGroupAddon>
                        <InputGroupInput
                            placeholder="Search members…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </InputGroup>
                    {/* Far right of the bar. It hides this pane, so it lives in it;
                        collapsed, the screen puts it back beside the automation title. */}
                    {onCollapse && (
                        <Button aria-label="Hide performance" className="shrink-0" size="icon" type="button" variant="ghost" onClick={onCollapse}>
                            <LucideIcon.X strokeWidth={2} />
                        </Button>
                    )}
                </Inline>
                <div className={cn('grid transition-[grid-template-rows,opacity] duration-200 ease-out', stuck ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                        <div className="flex gap-2 pt-4">
                            {STATUS_FACETS.map((facet) => {
                                const active = statusFilter === facet.label;
                                return (
                                    <button
                                        key={facet.label}
                                        // Label dropped here (the 2x2 cards above teach the
                                        // glyph→meaning mapping before these collapse in) so the
                                        // chips stay narrow enough to avoid a side-scroll. The
                                        // name lives on aria-label + title for a11y and hover recall.
                                        aria-label={facet.label}
                                        aria-pressed={active}
                                        className={cn(
                                            // rounded-md to match the members page's filter
                                            // chips (Shade Filters' default radius).
                                            'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-sm transition-colors [&_svg]:size-4',
                                            active ? 'border-foreground bg-muted-foreground/10' : 'border-border-default hover:bg-muted-foreground/5'
                                        )}
                                        title={facet.label}
                                        type="button"
                                        onClick={() => setStatusFilter(active ? null : facet.label)}
                                    >
                                        <span className={facet.color}>{facet.glyph}</span>
                                        {/* Selected lifts the count to full text colour — the border and
                                                fill mark the chip, but keeping its number muted made the
                                                active filter look no more current than the idle ones. */}
                                            <span className={cn('tabular-nums', active ? 'text-foreground' : 'text-muted-foreground')}>{formatNumber(counts[facet.label] ?? 0)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Runs table. The cards above scroll off as the search bar sticks, so the
                header lands right beneath the sticky bar every time. table-fixed keeps
                the Started/Status column widths steady no matter how the labels change. */}
            <div className="px-6 pb-6">
                <Table className="table-fixed" data-testid="float-runs-table">
                {/* border-b-0 on both — see variant-b: the SortHead inset shadow is
                    the single rule; Shade's defaults doubled it at rest. */}
                <TableHeader className="border-b-0">
                    <TableRow className="border-b-0 hover:bg-transparent">
                        <SortHead label="Member" onSort={onSort} sort={sort} sortKey="member" />
                        <SortHead className="w-24" label="Started" onSort={onSort} sort={sort} sortKey="started" />
                        <SortHead className="w-24" label="Status" onSort={onSort} sort={sort} sortKey="status" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                            <TableCell className="py-6 text-center text-sm text-muted-foreground" colSpan={3}>No members match.</TableCell>
                        </TableRow>
                    )}
                    {sorted.map(({run, label: statusLabel, pct}) => {
                        const isSelected = run.id === selectedMemberId;
                        // In-progress reads blue (its ring arc inherits the same colour
                        // via currentColor), Upgraded green, Unsubscribed yellow, and
                        // Done (settled) is muted. Mirrors the status cards' colours.
                        const statusColor = statusLabel === 'Upgraded'
                            ? 'text-green-600 dark:text-green'
                            : statusLabel === 'Unsubscribed'
                                ? 'text-yellow-600 dark:text-yellow'
                                : run.status === 'in_progress' ? 'text-blue-600 dark:text-blue' : 'text-muted-foreground';
                        return (
                            <TableRow
                                key={run.id}
                                aria-selected={isSelected}
                                // Row drives the states with subtle muted-foreground tints;
                                // cells neutralise Shade's built-in group-hover (its
                                // table-row-hover token blends into this panel's surface).
                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-muted-foreground/10' : 'hover:bg-muted-foreground/5'}`}
                                // Toggle: clicking the selected row again de-selects it.
                                onClick={() => onSelectMember(isSelected ? null : run.id)}
                            >
                                <TableCell className="min-w-0 px-4 py-4 group-hover:bg-transparent">
                                    <span className={`block min-w-0 truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}>{run.member.name}</span>
                                </TableCell>
                                <TableCell className="w-24 px-4 py-4 align-middle group-hover:bg-transparent">
                                    {/* Same size and colour as the member column — it's a
                                        value in its own right, not an annotation on the
                                        name. Only the weight separates them. */}
                                    <span className="block truncate text-base">{startedLabel(run.enrolled_at)}</span>
                                </TableCell>
                                <TableCell className="w-24 px-4 py-4 text-center align-middle group-hover:bg-transparent">
                                    {/* Icon only — the status cards above name each state. */}
                                    <div className={cn('flex justify-center', statusColor)} title={statusLabel}>
                                        <StatusGlyph label={statusLabel} pct={pct} run={run} />
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
