import React, {useEffect, useMemo, useRef, useState} from 'react';
import {BarChartLoadingIndicator, InputGroup, InputGroupAddon, InputGroupInput, MetricValue, Navbar, NavbarActions, NavbarNavigation, PageMenu, PageMenuItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Inline, Stack} from '@tryghost/shade/primitives';
import {GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import type {AutomationScenario, RunStatus} from '@/automations/proto/shared/mock';
import {latestActivity, startedLabel} from '@/automations/proto/shared/member-runs';
import {StatusPill} from '@/automations/proto/shared/status-pill';
import {toAreaData} from '@/automations/proto/shared/chart';

// Shared so the real chart and the skeleton's reserved space can't drift.
const CHART_HEIGHT = 'h-64';

// Simulated fetch delay purely to preview the Analytics-page-style skeletons.
// 0 = skeletons never show; the loading path stays wired so engineers can point
// `isLoading` at a real query. Bump this (e.g. 600) to preview the skeletons.
const SKELETON_DELAY_MS = 0;

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
    <Box aria-hidden="true" className="rounded-lg border border-border-default px-4 py-3">
        {/*
            Invisible real content (MetricValue header + chart-height spacer) reserves the
            loaded card's exact height, so nothing resizes on load — no magic numbers, it
            stays correct if MetricValue or the chart height change. Only the centred
            three-bar indicator shows, matching the Analytics page's chart-loading state.
        */}
        <Stack className="relative" gap="sm">
            <MetricValue className="invisible" label="Total runs" value="0" />
            <div className={`${CHART_HEIGHT} invisible`} />
            <div className="absolute inset-0">
                <BarChartLoadingIndicator />
            </div>
        </Stack>
    </Box>
);

const RunRowSkeleton: React.FC = () => (
    <TableRow aria-hidden="true" className="hover:bg-transparent">
        <TableCell className="min-w-0 px-4 py-3">
            <div className="min-w-0">
                <Skeleton className="mb-1 h-4 w-32 max-w-full" />
                <Skeleton className="h-3 w-24 max-w-full" />
            </div>
        </TableCell>
        <TableCell className="w-24 px-4 py-3">
            <Skeleton className="h-4 w-10" />
        </TableCell>
        <TableCell className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-5 w-20 rounded-sm" />
        </TableCell>
    </TableRow>
);

// Surface uses its own run-status wording (Running / Stopped) across the metric
// tiles, filter, and badges. Kept local so the dashboard's shared labels are
// unaffected.
const STATUS_LABEL: Record<RunStatus, string> = {
    in_progress: 'Running',
    completed: 'Completed',
    exited_early: 'Stopped'
};

type FilterKey = 'all' | RunStatus;

interface SurfaceAnalyticsPaneProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    // Direct setter (null = clear). Must be referentially stable — the tab-sync
    // effect below depends on it, so an unstable callback would re-fire the
    // effect every render and stomp on member clicks.
    onSelectMember: (runId: string | null) => void;
}

export const SurfaceAnalyticsPane: React.FC<SurfaceAnalyticsPaneProps> = ({scenario, selectedMemberId, onSelectMember}) => {
    const {metrics, runs} = scenario;
    const [tab, setTab] = useState('overview');
    const [filter, setFilter] = useState<FilterKey>('all');
    const [query, setQuery] = useState('');
    const [range, setRange] = useState('30');

    // Re-triggers on tab change since each tab is logically its own load. With a
    // 0ms delay this stays false (no skeleton flash); see SKELETON_DELAY_MS.
    const [isLoading, setIsLoading] = useState(SKELETON_DELAY_MS > 0);
    useEffect(() => {
        setIsLoading(SKELETON_DELAY_MS > 0);
        if (SKELETON_DELAY_MS <= 0) {
            return;
        }
        const timeout = window.setTimeout(() => setIsLoading(false), SKELETON_DELAY_MS);
        return () => window.clearTimeout(timeout);
    }, [tab]);

    const visible = useMemo(() => runs.filter((run) => {
        const matchesFilter = filter === 'all' || run.status === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery = run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
    }), [runs, filter, query]);

    // Latest first-visible id — read (not depended on) by the tab-sync effect, so
    // entering Runs selects the first member without the effect re-firing on every
    // filter/search change.
    const firstVisibleIdRef = useRef<string | null>(null);
    firstVisibleIdRef.current = visible[0]?.id ?? null;

    // Canvas focus tracks the tab: Overview shows the generic preview (no member
    // focused), Runs focuses a member (the first on entry). This is what lets you
    // leave Runs for Overview and get the preview back, rather than staying stuck
    // on the last-selected member.
    useEffect(() => {
        onSelectMember(tab === 'runs' ? firstVisibleIdRef.current : null);
    }, [tab, onSelectMember]);

    // Daily runs-started series, mapped via the shared area-chart helper.
    const chartData = toAreaData(metrics.enrollments_by_day, {range: Number(range), label: 'Runs'});
    const chartMax = Math.max(...chartData.map(point => point.value), 1);

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
                        {/* Leading calendar; the SelectTrigger's built-in trailing chevron
                            (its last svg child) is hidden since there's no prop for it. */}
                        <SelectTrigger className="w-36 justify-start gap-2 [&>svg:last-child]:hidden">
                            <LucideIcon.Calendar className="size-4 text-muted-foreground" />
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
                                    className={`${CHART_HEIGHT} w-full`}
                                    color="var(--chart-blue)"
                                    data={chartData}
                                    id={`surface-runs-${scenario.automation.id}`}
                                    range={chartData.length}
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
                                <MetricTile dot="bg-blue" label={STATUS_LABEL.in_progress} value={metrics.in_progress} />
                                <MetricTile dot="bg-green" label={STATUS_LABEL.completed} value={metrics.completed} />
                                <MetricTile dot="bg-orange" label={STATUS_LABEL.exited_early} value={metrics.exited_early} />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Runs — member list */}
            {tab === 'runs' && (
                <div className="mt-4 flex flex-col gap-4">
                    <Inline align="center" gap="sm">
                        {/* h-(--control-height) + inner !h-[34px] follows the members page's
                            search box, so this lines up with the Select (also --control-height,
                            32px) instead of the InputGroup's taller h-9 default. */}
                        <InputGroup className="h-(--control-height) min-w-0 flex-1" data-disabled={isLoading || undefined}>
                            <InputGroupAddon>
                                <LucideIcon.Search />
                            </InputGroupAddon>
                            <InputGroupInput
                                className="!h-[34px]"
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
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="in_progress">{STATUS_LABEL.in_progress}</SelectItem>
                                <SelectItem value="completed">{STATUS_LABEL.completed}</SelectItem>
                                <SelectItem value="exited_early">{STATUS_LABEL.exited_early}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Inline>

                    {/* table-fixed so the Started/Status columns keep their set
                        widths no matter how the labels change between filters —
                        only the flexible Member column reflows. */}
                    <Table className="table-fixed" data-testid="surface-runs-table">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="px-4 text-base">Member</TableHead>
                                <TableHead className="w-24 px-4 text-base">Started</TableHead>
                                <TableHead className="w-24 px-4 text-right text-base">Status</TableHead>
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
                                    <TableCell className="py-6 text-center text-base text-muted-foreground" colSpan={3}>No members match.</TableCell>
                                </TableRow>
                            )}
                            {!isLoading && visible.map((run) => {
                                const isSelected = run.id === selectedMemberId;
                                return (
                                    <TableRow
                                        key={run.id}
                                        aria-selected={isSelected}
                                        className={`cursor-pointer ${isSelected ? 'bg-muted/60' : 'hover:bg-table-row-hover'}`}
                                        onClick={() => onSelectMember(run.id)}
                                    >
                                        <TableCell className="min-w-0 px-4 py-3">
                                            <div className="min-w-0">
                                                <span className={`block truncate text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}>{run.member.name}</span>
                                                <span className="block truncate text-muted-foreground">{latestActivity(run, scenario.automation.actions)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-24 px-4 py-3 text-base">{startedLabel(run.enrolled_at)}</TableCell>
                                        <TableCell className="px-4 py-3 text-right"><StatusPill label={STATUS_LABEL[run.status]} status={run.status} /></TableCell>
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
