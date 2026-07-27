import React, {useMemo, useRef, useState} from 'react';
import {InputGroup, InputGroupAddon, InputGroupInput, MetricValue, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeadButton, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Inline, Stack} from '@tryghost/shade/primitives';
import {GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun, AutomationScenario, RunStatus} from '@/automations/proto/shared/mock';
import {toAreaData} from '@/automations/proto/shared/chart';

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
        <div className="flex w-96 flex-col gap-4 p-4">
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

type FilterKey = 'all' | RunStatus;

// --- Float-local run row presentation --------------------------------------
// The dashboard/surface concepts describe a run with the shared runProgress
// text ("45% complete - Upgraded to paid") + shared StatusPill (In progress /
// Completed / Exited early). This concept simplifies the row to two things: a
// short status label (where the member is now, or how they left) with a slim
// progress bar under it. All of it is local to float — the shared helpers stay
// exactly as the other concepts use them.

const runPercent = (run: AutomationRun): number => {
    const total = run.steps.length;
    const done = run.steps.filter(step => step.state === 'done').length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
};

// Status label is derived, not a fixed enum: completed → Done, in-progress → In
// progress, exited → Unsubscribed/Upgraded. (Labels here are still a first pass —
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
    return 'In progress';
};

// Slim progress bar — the same neutral track and fill for every run.
const RunProgressBar: React.FC<{value: number}> = ({value}) => (
    <div className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground" style={{width: `${value}%`}} />
    </div>
);

type SortKey = 'member' | 'progress' | 'status';
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
    const [filter, setFilter] = useState<FilterKey>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortState>({key: 'member', direction: 'asc'});

    // Clicking a column sorts by it ascending; clicking the active column flips
    // the direction.
    const onSort = (key: SortKey) => setSort(prev => (
        prev.key === key
            ? {key, direction: prev.direction === 'asc' ? 'desc' : 'asc'}
            : {key, direction: 'asc'}
    ));

    const visible = useMemo(() => runs.filter((run) => {
        const matchesFilter = filter === 'all' || run.status === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery = run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
    }), [runs, filter, query]);

    const sorted = useMemo<SortedRun[]>(() => {
        const rows = visible.map(run => ({run, label: runStatusLabel(run), pct: runPercent(run)}));
        rows.sort((a, b) => {
            const cmp = sort.key === 'progress'
                ? a.pct - b.pct
                : sort.key === 'status'
                    ? a.label.localeCompare(b.label)
                    : a.run.member.name.localeCompare(b.run.member.name);
            return sort.direction === 'asc' ? cmp : -cmp;
        });
        return rows;
    }, [visible, sort]);

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
        <div className="flex min-h-0 w-[420px] flex-1 flex-col gap-4 p-4">
            {/* Title + search/filter on one row, matching the Overview header. */}
            <Inline align="center" className="shrink-0" gap="md">
                <span className="text-md font-semibold">Runs</span>
                <Inline align="center" className="min-w-0 flex-1" gap="sm">
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
                    <Select value={filter} onValueChange={value => setFilter(value as FilterKey)}>
                        <SelectTrigger className="w-32 shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="in_progress">In progress</SelectItem>
                            <SelectItem value="completed">Done</SelectItem>
                            <SelectItem value="exited_early">Exited early</SelectItem>
                        </SelectContent>
                    </Select>
                </Inline>
            </Inline>

            {/* Table's className lands on the inner <table>, not a wrapping
                scroll container (see table.tsx), so the scrollable region has
                to be a div around it rather than a class on Table itself. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {/* table-fixed so the Progress/Status columns keep their set widths
                    (below) no matter how the labels change between sorts/filters —
                    only the flexible Member column reflows. */}
                <Table className="table-fixed" data-testid="float-runs-table">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <SortHead label="Member" onSort={onSort} sort={sort} sortKey="member" />
                            <SortHead className="w-28" label="Progress" onSort={onSort} sort={sort} sortKey="progress" />
                            <SortHead className="w-32" label="Status" onSort={onSort} sort={sort} sortKey="status" />
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
                            // Outcomes are colour-coded; an active run stays neutral-bright
                            // and a finished ("Done") run stays muted.
                            const statusColor = statusLabel === 'Upgraded'
                                ? 'text-green'
                                : statusLabel === 'Unsubscribed'
                                    ? 'text-orange'
                                    : run.status === 'in_progress' ? 'text-foreground' : 'text-muted-foreground';
                            return (
                                <TableRow
                                    key={run.id}
                                    aria-selected={isSelected}
                                    className={`cursor-pointer ${isSelected ? 'bg-muted' : 'hover:bg-table-row-hover'}`}
                                    onClick={() => onSelectMember(run.id)}
                                >
                                    <TableCell className="min-w-0 px-4 py-4">
                                        <span className={`block min-w-0 truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}>{run.member.name}</span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 align-middle">
                                        <RunProgressBar value={pct} />
                                    </TableCell>
                                    <TableCell className="px-4 py-4 align-middle">
                                        <span className={`block truncate text-sm ${statusColor}`}>{statusLabel}</span>
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
