import React, {useMemo, useState} from 'react';
import {Input, MetricValue, Navbar, NavbarActions, NavbarNavigation, PageMenu, PageMenuItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Box, Inline, Stack} from '@tryghost/shade/primitives';
import {type GhAreaChartDataItem, GhAreaChart, KpiCardHeaderLabel} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun, AutomationScenario, RunStatus} from '@/automations/proto/shared/mock';

// Fixed "now" so relative activity labels are deterministic against the mock.
const NOW_MS = new Date('2026-07-21T09:12:00Z').getTime();

const runStatusMeta: Record<RunStatus, {label: string; pill: string}> = {
    in_progress: {label: 'In progress', pill: 'bg-blue/15 text-blue'},
    completed: {label: 'Completed', pill: 'bg-green/15 text-green'},
    exited_early: {label: 'Exited early', pill: 'bg-muted text-muted-foreground'}
};

const relActivity = (run: AutomationRun): string => {
    const stamps = run.steps.map(s => s.occurred_at).filter((t): t is string => Boolean(t));
    const latest = stamps.length > 0 ? stamps[stamps.length - 1] : run.enrolled_at;
    const mins = Math.round((NOW_MS - new Date(latest).getTime()) / 60_000);
    if (mins < 1) {
        return 'just now';
    }
    if (mins < 60) {
        return `${mins}m ago`;
    }
    if (mins < 1_440) {
        return `${Math.round(mins / 60)}h ago`;
    }
    return `${Math.round(mins / 1_440)}d ago`;
};

const MetricTile: React.FC<{label: string; value: number}> = ({label, value}) => (
    <Box className="rounded-lg border border-border-default px-4 py-3">
        <MetricValue label={label} value={formatNumber(value)} />
    </Box>
);

const StatusPill: React.FC<{status: RunStatus}> = ({status}) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase ${runStatusMeta[status].pill}`}>
        {runStatusMeta[status].label}
    </span>
);

type FilterKey = 'all' | RunStatus;

interface SurfaceAnalyticsPaneProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    onSelectMember: (runId: string) => void;
}

export const SurfaceAnalyticsPane: React.FC<SurfaceAnalyticsPaneProps> = ({scenario, selectedMemberId, onSelectMember}) => {
    const {metrics, runs} = scenario;
    const [tab, setTab] = useState('overview');
    const [filter, setFilter] = useState<FilterKey>('all');
    const [query, setQuery] = useState('');
    const [range, setRange] = useState('30');

    const visible = useMemo(() => runs.filter((run) => {
        const matchesFilter = filter === 'all' || run.status === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery = run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
    }), [runs, filter, query]);

    // Daily runs-started series, mapped to the shared area-chart shape.
    const slicedPoints = metrics.enrollments_by_day.slice(-Number(range));
    const chartMax = Math.max(...slicedPoints.map(p => p.count), 1);
    const chartData: GhAreaChartDataItem[] = slicedPoints.map(point => ({
        date: point.date,
        value: point.count,
        formattedValue: formatNumber(point.count),
        label: 'Runs'
    }));

    return (
        <Box className="px-6 py-4">
            {/*
                Nav — tabs on the left, timeframe on the right (mirrors the Analytics page).
                `!py-0` overrides the global `body.react-admin [data-navbar="navbar"]` compat
                rule (index.css) that forces 20px top/bottom padding on every Navbar app-wide —
                we can't edit that shared rule without shifting the real Analytics pages, so we
                zero it out locally and own the 16px spacing via the pane's own padding instead.
            */}
            <Navbar className="flex items-center justify-between gap-x-5 border-b-0 !py-0">
                <NavbarNavigation>
                    <PageMenu defaultValue={tab}>
                        <PageMenuItem value="overview" onClick={() => setTab('overview')}>Overview</PageMenuItem>
                        <PageMenuItem value="runs" onClick={() => setTab('runs')}>Runs</PageMenuItem>
                    </PageMenu>
                </NavbarNavigation>
                <NavbarActions className="mt-0">
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </NavbarActions>
            </Navbar>

            {/* Overview — metric cards + runs-started chart */}
            {tab === 'overview' && (
                <div className="mt-4 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <MetricTile label="Total runs" value={metrics.enrollments} />
                        <MetricTile label="In progress" value={metrics.in_progress} />
                        <MetricTile label="Completed" value={metrics.completed} />
                        <MetricTile label="Exited early" value={metrics.exited_early} />
                    </div>
                    <Box className="rounded-lg border border-border-default px-4 py-3">
                        <Stack gap="sm">
                            <KpiCardHeaderLabel>
                                <LucideIcon.Zap size={16} strokeWidth={1.5} />
                                Runs started
                            </KpiCardHeaderLabel>
                            <GhAreaChart
                                className="h-64 w-full"
                                color="var(--chart-blue)"
                                data={chartData}
                                id={`surface-runs-${scenario.automation.id}`}
                                range={slicedPoints.length}
                                showYAxisValues={false}
                                yAxisRange={[0, chartMax]}
                            />
                        </Stack>
                    </Box>
                </div>
            )}

            {/* Runs — member list */}
            {tab === 'runs' && (
                <div className="mt-4 flex flex-col gap-4">
                    <Inline align="center" gap="sm">
                        <div className="relative min-w-0 flex-1">
                            <LucideIcon.Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Search members…" value={query} onChange={e => setQuery(e.target.value)} />
                        </div>
                        <Select value={filter} onValueChange={value => setFilter(value as FilterKey)}>
                            <SelectTrigger className="w-36 shrink-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="in_progress">In progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="exited_early">Exited early</SelectItem>
                            </SelectContent>
                        </Select>
                    </Inline>

                    <Stack gap="none">
                        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border-default pb-2 text-xs font-medium text-muted-foreground">
                            <span>Member</span>
                            <span>Activity</span>
                            <span>Status</span>
                        </div>
                        {visible.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">No members match.</div>
                        )}
                        {visible.map((run) => {
                            const isSelected = run.id === selectedMemberId;
                            return (
                                <button
                                    key={run.id}
                                    aria-pressed={isSelected}
                                    className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border-default px-2 py-3 text-left transition-colors ${isSelected ? 'bg-muted' : 'hover:bg-table-row-hover'}`}
                                    type="button"
                                    onClick={() => onSelectMember(run.id)}
                                >
                                    <span className={`truncate text-sm ${isSelected ? 'font-semibold' : ''}`}>{run.member.name}</span>
                                    <span className="text-sm text-muted-foreground">{relActivity(run)}</span>
                                    <StatusPill status={run.status} />
                                </button>
                            );
                        })}
                    </Stack>
                </div>
            )}
        </Box>
    );
};

export default SurfaceAnalyticsPane;
