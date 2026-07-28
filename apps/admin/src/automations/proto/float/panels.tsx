import React, {useMemo, useRef, useState} from 'react';
import {Button, InputGroup, InputGroupAddon, InputGroupInput, MetricValue, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeadButton, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Inline, Stack} from '@tryghost/shade/primitives';
import {GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun, AutomationScenario} from '@/automations/proto/shared/mock';
import {toAreaData} from '@/automations/proto/shared/chart';
import {startedLabel} from '@/automations/proto/shared/member-runs';

// Flyout content for the float concept's rail — adapted from the surface
// concept's SurfaceAnalyticsPane (analytics-pane.tsx), which docks both of
// these in one pane behind an internal tab switcher. Here the rail itself is
// the switcher (each button opens its own Popover), so these render as two
// independent, leaner panels with no internal tab chrome. First pass: no
// loading skeletons yet (surface's SKELETON_DELAY_MS was already off by
// default) — worth adding if this concept sticks.

const CHART_HEIGHT = 'h-56';

const MetricTile: React.FC<{label: string; value: number; dot?: string}> = ({label, value, dot}) => (
    <Box className="rounded-lg border border-border-default px-4 py-3">
        <MetricValue
            label={(
                <>
                    {dot && <span className={`size-2 rounded-full ${dot}`} />}
                    {label}
                </>
            )}
            value={formatNumber(value)}
        />
    </Box>
);

export const OverviewPanel: React.FC<{scenario: AutomationScenario}> = ({scenario}) => {
    const {metrics} = scenario;
    const [range, setRange] = useState('30');

    const chartData = toAreaData(metrics.enrollments_by_day, {range: Number(range), label: 'Runs'});
    const chartMax = Math.max(...chartData.map(point => point.value), 1);

    return (
        <div className="flex w-[480px] flex-col gap-4 p-6">
            <Inline align="center" justify="between">
                <span className="text-md font-semibold">Overview</span>
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
                        id={`float-runs-${scenario.automation.id}`}
                        range={chartData.length}
                        showYAxisValues={false}
                        yAxisRange={[0, chartMax]}
                    />
                </Stack>
            </Box>
            <div className="grid grid-cols-3 gap-3">
                <MetricTile dot="bg-blue" label="In progress" value={metrics.in_progress} />
                <MetricTile dot="bg-green" label="Completed" value={metrics.completed} />
                <MetricTile dot="bg-orange" label="Exited early" value={metrics.exited_early} />
            </div>
        </div>
    );
};

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
    const Icon = label === 'Upgraded' ? LucideIcon.ChevronsUp : label === 'Unsubscribed' ? LucideIcon.CircleMinus : LucideIcon.Check;
    return <Icon className="size-[18px] shrink-0" strokeWidth={1.5} />;
};

// Quick-filter chips (test) — each matches a derived status label and carries the
// same glyph/colour as the status column. Running shows a fixed ~50% ring just to
// convey the shape.
const QUICK_FILTERS: {label: string; color: string; glyph: React.ReactNode}[] = [
    {label: 'Running', color: 'text-blue-500', glyph: <ProgressRing value={50} />},
    {label: 'Upgraded', color: 'text-green', glyph: <LucideIcon.ChevronsUp strokeWidth={1.5} />},
    {label: 'Unsubscribed', color: 'text-muted-foreground', glyph: <LucideIcon.CircleMinus strokeWidth={1.5} />},
    {label: 'Done', color: 'text-muted-foreground', glyph: <LucideIcon.Check strokeWidth={1.5} />}
];

type SortKey = 'member' | 'started' | 'status';
type SortDir = 'asc' | 'desc';
type SortState = {key: SortKey; direction: SortDir};

// One enriched row, so the status label / percent are computed once and reused
// by both the sort comparator and the rendered row.
type SortedRun = {run: AutomationRun; label: string; pct: number};

// Sortable column header — reuses Shade's TableHeadButton (same primitive the
// analytics tables sort with), overriding its uppercase/right-aligned defaults
// back to this list's plain left-aligned muted header style. Only the active
// column shows a direction arrow, to keep the header quiet. `className` sets the
// (fixed) column width on the header cell — with table-fixed below, that width
// governs the whole column.
const SortHead: React.FC<{
    label: string;
    sortKey: SortKey;
    sort: SortState;
    onSort: (key: SortKey) => void;
    className?: string;
}> = ({label, sortKey, sort, onSort, className}) => {
    const active = sort.key === sortKey;
    return (
        <TableHead className={`px-4 ${className ?? ''}`}>
            <TableHeadButton
                className="font-medium text-muted-foreground normal-case"
                onClick={() => onSort(sortKey)}
            >
                {label}
                {active && (sort.direction === 'asc' ? <LucideIcon.ArrowUp /> : <LucideIcon.ArrowDown />)}
            </TableHeadButton>
        </TableHead>
    );
};

interface RunsPanelProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    onSelectMember: (runId: string | null) => void;
}

export const RunsPanel: React.FC<RunsPanelProps> = ({scenario, selectedMemberId, onSelectMember}) => {
    const {runs} = scenario;
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortState>({key: 'member', direction: 'asc'});
    // Quick-filter chip (test) — matches on the derived status label, independent
    // of the existing status dropdown.
    const [quickFilter, setQuickFilter] = useState<string | null>(null);

    // Clicking a column sorts by it ascending; clicking the active column flips
    // the direction.
    const onSort = (key: SortKey) => setSort(prev => (
        prev.key === key
            ? {key, direction: prev.direction === 'asc' ? 'desc' : 'asc'}
            : {key, direction: 'asc'}
    ));

    const visible = useMemo(() => runs.filter((run) => {
        const q = query.trim().toLowerCase();
        return run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q);
    }), [runs, query]);

    const sorted = useMemo<SortedRun[]>(() => {
        const rows = visible
            .map(run => ({run, label: runStatusLabel(run), pct: runPercent(run)}))
            .filter(row => !quickFilter || row.label === quickFilter);
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
    }, [visible, sort, quickFilter]);

    // Opening this panel focuses the first member so the canvas has something to
    // show right away — mirrors the surface pane's tab-entry sync, simplified to a
    // one-time mount effect since there's no tab to react to here.
    const hasFocusedOnMount = useRef(false);
    if (!hasFocusedOnMount.current) {
        hasFocusedOnMount.current = true;
        if (!selectedMemberId) {
            onSelectMember(sorted[0]?.run.id ?? null);
        }
    }

    return (
        <div className="flex min-h-0 w-[480px] flex-1 flex-col gap-4 p-6">
            {/* Title left, a fixed 200px search pinned right. Status filtering now
                lives in the quick-filter chips below, so the old dropdown is gone. */}
            <Inline align="center" className="shrink-0" gap="md" justify="between">
                <span className="text-md font-semibold">Runs</span>
                <InputGroup className="w-[200px] shrink-0">
                    <InputGroupAddon>
                        <LucideIcon.Search />
                    </InputGroupAddon>
                    <InputGroupInput
                        placeholder="Search members…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </InputGroup>
            </Inline>

            {/* Quick-filter chip row (test) — toggles a label match on top of the
                existing controls. */}
            <Inline align="center" className="shrink-0 flex-wrap" gap="sm">
                {QUICK_FILTERS.map((qf) => {
                    const active = quickFilter === qf.label;
                    return (
                        <Button
                            key={qf.label}
                            aria-pressed={active}
                            className={`h-8 gap-1.5 rounded-full px-3 font-normal ${active ? 'border-foreground bg-muted-foreground/10' : ''}`}
                            variant="outline"
                            onClick={() => setQuickFilter(active ? null : qf.label)}
                        >
                            <span className={qf.color}>{qf.glyph}</span>
                            <span className="text-sm">{qf.label}</span>
                        </Button>
                    );
                })}
            </Inline>

            {/* Table's className lands on the inner <table>, not a wrapping
                scroll container (see table.tsx), so the scrollable region has
                to be a div around it rather than a class on Table itself. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {/* table-fixed so the Started/Status columns keep their set widths
                    (below) no matter how the labels change between sorts/filters —
                    only the flexible Member column reflows. */}
                <Table className="table-fixed" data-testid="float-runs-table">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
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
                            // via currentColor), Upgraded green, and everything settled
                            // (Done / Unsubscribed) is muted.
                            const statusColor = statusLabel === 'Upgraded'
                                ? 'text-green'
                                : run.status === 'in_progress' ? 'text-blue-500' : 'text-muted-foreground';
                            return (
                                <TableRow
                                    key={run.id}
                                    aria-selected={isSelected}
                                    // Row drives the states with subtle muted-foreground tints;
                                    // cells neutralise Shade's built-in group-hover (its
                                    // table-row-hover token blends into this panel's surface).
                                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-muted-foreground/10' : 'hover:bg-muted-foreground/5'}`}
                                    onClick={() => onSelectMember(run.id)}
                                >
                                    <TableCell className="min-w-0 px-4 py-4 group-hover:bg-transparent">
                                        <span className={`block min-w-0 truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}>{run.member.name}</span>
                                    </TableCell>
                                    <TableCell className="w-24 px-4 py-4 align-middle group-hover:bg-transparent">
                                        <span className="block truncate text-sm text-muted-foreground">{startedLabel(run.enrolled_at)}</span>
                                    </TableCell>
                                    <TableCell className="w-24 px-4 py-4 align-middle group-hover:bg-transparent">
                                        {/* Icon only — the quick-filter legend above names each state. */}
                                        <div className={statusColor} title={statusLabel}>
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
    );
};
