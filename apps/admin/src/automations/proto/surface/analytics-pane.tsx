import React, {useEffect, useMemo, useState} from 'react';
import {Avatar, BarChartLoadingIndicator, InputGroup, InputGroupAddon, InputGroupInput, MetricValue, Navbar, NavbarActions, NavbarNavigation, PageMenu, PageMenuItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Inline, Stack} from '@tryghost/shade/primitives';
import {type GhAreaChartDataItem, GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import type {AutomationRun, AutomationScenario, RunStatus} from '@/automations/proto/shared/mock';

const runStatusMeta: Record<RunStatus, {label: string; pill: string}> = {
    in_progress: {label: 'In progress', pill: 'bg-blue/15 text-blue'},
    completed: {label: 'Completed', pill: 'bg-green/15 text-green'},
    exited_early: {label: 'Exited early', pill: 'bg-muted text-muted-foreground'}
};

// e.g. "45% complete", or "25% complete - Unsubscribed" when exited early.
const runProgress = (run: AutomationRun): string => {
    const total = run.steps.length;
    const done = run.steps.filter(s => s.state === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (run.status === 'exited_early' && run.exit_reason) {
        return `${pct}% complete - ${run.exit_reason}`;
    }
    return `${pct}% complete`;
};

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

// Loading placeholders — shapes mirror their real counterparts 1:1 (per the
// Analytics page's convention) so nothing shifts size once data arrives.
const MetricTileSkeleton: React.FC = () => (
    <Box className="rounded-lg border border-border-default px-4 py-3">
        <div className="flex w-full flex-col items-start gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12" />
        </div>
    </Box>
);

const RunsChartCardSkeleton: React.FC = () => (
    <Box className="rounded-lg border border-border-default px-4 py-3">
        <Stack gap="sm">
            <div className="flex w-full flex-col items-start gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-16" />
            </div>
            <div className="h-64 w-full">
                <BarChartLoadingIndicator />
            </div>
        </Stack>
    </Box>
);

const RunRowSkeleton: React.FC = () => (
    <TableRow aria-hidden="true" className="hover:bg-transparent">
        <TableCell className="min-w-0 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="size-8 min-w-8 rounded-full" />
                <div className="min-w-0 flex-1">
                    <Skeleton className="mb-1 h-4 w-32 max-w-full" />
                    <Skeleton className="h-3 w-24 max-w-full" />
                </div>
            </div>
        </TableCell>
        <TableCell className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-5 w-20 rounded-full" />
        </TableCell>
    </TableRow>
);

const StatusPill: React.FC<{status: RunStatus}> = ({status}) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap uppercase ${runStatusMeta[status].pill}`}>
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

    // Simulated fetch — the mock data itself resolves instantly, so this is here
    // purely to preview the Analytics-page-style skeleton states. Re-triggers on
    // tab change since each tab is logically its own load.
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        setIsLoading(true);
        const timeout = window.setTimeout(() => setIsLoading(false), 600);
        return () => window.clearTimeout(timeout);
    }, [tab]);

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

            {/* Overview — total-runs chart, then the remaining run states in one row */}
            {tab === 'overview' && (
                <div className="mt-4 flex flex-col gap-4">
                    {isLoading ? (
                        <RunsChartCardSkeleton />
                    ) : (
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
                    )}
                    <div className="grid grid-cols-3 gap-4">
                        {isLoading ? (
                            <>
                                <MetricTileSkeleton />
                                <MetricTileSkeleton />
                                <MetricTileSkeleton />
                            </>
                        ) : (
                            <>
                                <MetricTile dot="bg-blue" label="In progress" value={metrics.in_progress} />
                                <MetricTile dot="bg-green" label="Completed" value={metrics.completed} />
                                <MetricTile dot="bg-orange" label="Exited early" value={metrics.exited_early} />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Runs — member list */}
            {tab === 'runs' && (
                <div className="mt-4 flex flex-col gap-4">
                    <Inline align="center" gap="sm">
                        <InputGroup className="min-w-0 flex-1" data-disabled={isLoading || undefined}>
                            <InputGroupAddon>
                                <LucideIcon.Search />
                            </InputGroupAddon>
                            <InputGroupInput
                                disabled={isLoading}
                                placeholder="Search members…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </InputGroup>
                        <Select disabled={isLoading} value={filter} onValueChange={value => setFilter(value as FilterKey)}>
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

                    <Table data-testid="surface-runs-table">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="px-4">Member</TableHead>
                                <TableHead className="px-4 text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <>
                                    <RunRowSkeleton />
                                    <RunRowSkeleton />
                                    <RunRowSkeleton />
                                    <RunRowSkeleton />
                                </>
                            )}
                            {!isLoading && visible.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell className="py-6 text-center text-sm text-muted-foreground" colSpan={2}>No members match.</TableCell>
                                </TableRow>
                            )}
                            {!isLoading && visible.map((run) => {
                                const isSelected = run.id === selectedMemberId;
                                return (
                                    <TableRow
                                        key={run.id}
                                        aria-selected={isSelected}
                                        className={`cursor-pointer ${isSelected ? 'bg-muted' : 'hover:bg-table-row-hover'}`}
                                        onClick={() => onSelectMember(run.id)}
                                    >
                                        <TableCell className="min-w-0 px-4 py-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <Avatar className="size-8 min-w-8" email={run.member.email} name={run.member.name} />
                                                <div className="min-w-0">
                                                    <span className={`block truncate text-md ${isSelected ? 'font-semibold' : 'font-medium'}`}>{run.member.name}</span>
                                                    <span className="block truncate text-muted-foreground">{runProgress(run)}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right"><StatusPill status={run.status} /></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Box>
    );
};

export default SurfaceAnalyticsPane;
