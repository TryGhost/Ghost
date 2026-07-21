import React, {useMemo, useState} from 'react';
import type {AutomationAction} from '@tryghost/admin-x-framework/api/automations';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Box, Container, Inline, Stack} from '@tryghost/shade/primitives';
import {type GhAreaChartDataItem, GhAreaChart, TableFilterTab, TableFilterTabs} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {type AutomationRun, type RunStatus, type RunStepState, getScenario} from './mock';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

// Fixed "now" so relative labels are deterministic against the mock timestamps.
const NOW_MS = new Date('2026-07-21T09:12:00Z').getTime();

const runStatusMeta: Record<RunStatus, {label: string; text: string; dot: string}> = {
    in_progress: {label: 'In progress', text: 'text-blue', dot: 'bg-blue'},
    completed: {label: 'Completed', text: 'text-green', dot: 'bg-green'},
    exited_early: {label: 'Exited early', text: 'text-orange', dot: 'bg-orange'}
};

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

const relEnrolled = (iso: string | null): string => {
    if (!iso) {
        return 'No enrollments yet';
    }
    const diffH = Math.round((NOW_MS - new Date(iso).getTime()) / 3_600_000);
    if (diffH < 1) {
        return 'Last enrolled just now';
    }
    if (diffH < 24) {
        return `Last enrolled ${diffH}h ago`;
    }
    return `Last enrolled ${Math.round(diffH / 24)}d ago`;
};

const formatWait = (hours: number): string => {
    if (hours % 24 === 0) {
        const days = hours / 24;
        return `${days} day${days === 1 ? '' : 's'}`;
    }
    return `${hours} hour${hours === 1 ? '' : 's'}`;
};

const memberMeta = (run: AutomationRun): string => {
    if (run.status === 'completed' && run.completed_at) {
        return `Enrolled ${fmtDate(run.enrolled_at)} · finished ${fmtDate(run.completed_at)}`;
    }
    if (run.status === 'exited_early') {
        return run.exit_reason ?? 'Exited early';
    }
    return `Enrolled ${fmtDate(run.enrolled_at)}`;
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const MetricTile: React.FC<{label: string; value: number; sub: string; dot?: string}> = ({label, value, sub, dot}) => (
    <Box className="rounded-xl border border-border-default bg-surface-elevated" padding="lg">
        <Stack gap="sm">
            <Inline align="center" gap="xs">
                {dot && <span className={`size-2 rounded-full ${dot}`} />}
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </Inline>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatNumber(value)}</span>
            <span className="text-sm text-muted-foreground">{sub}</span>
        </Stack>
    </Box>
);

const stepStateStyles: Record<RunStepState, {icon: React.ElementType; color: string}> = {
    done: {icon: LucideIcon.Check, color: 'text-green'},
    current: {icon: LucideIcon.Clock, color: 'text-blue'},
    skipped: {icon: LucideIcon.Minus, color: 'text-muted-foreground'},
    upcoming: {icon: LucideIcon.Mail, color: 'text-muted-foreground'}
};

type TimelineCardData = {title: string; subtitle: string; state: RunStepState};

const TimelineCard: React.FC<{card: TimelineCardData}> = ({card}) => {
    const isCurrent = card.state === 'current';
    const isMuted = card.state === 'upcoming' || card.state === 'skipped';
    const {icon: Icon, color} = stepStateStyles[card.state];
    return (
        <>
            <div className={`flex items-start gap-3 rounded-lg border p-4 ${isCurrent ? 'border-blue bg-blue/10' : 'border-border-default bg-background'}`}>
                <span className={`mt-0.5 shrink-0 ${isCurrent ? 'text-blue' : color}`}>
                    <Icon className="size-5" strokeWidth={2} />
                </span>
                <Stack gap="none">
                    <span className={`font-semibold ${isCurrent ? 'text-blue' : isMuted ? 'text-muted-foreground' : 'text-foreground'}`}>{card.title}</span>
                    <span className={`text-sm ${isCurrent ? 'text-blue' : 'text-muted-foreground'}`}>{card.subtitle}</span>
                </Stack>
            </div>
            <div className="ml-6 h-4 w-px bg-border-default" />
        </>
    );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type FilterKey = 'all' | RunStatus;

const NotFound: React.FC<{onBack: () => void}> = ({onBack}) => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
        <EmptyIndicator title="Automation not found" />
        <Button variant="outline" onClick={onBack}>Back to automations</Button>
    </div>
);

const AutomationDashboard: React.FC = () => {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const toVersioned = useVersionLink();
    const [filter, setFilter] = useState<FilterKey>('all');
    const [query, setQuery] = useState('');
    const [range, setRange] = useState('30');

    const scenario = id ? getScenario(id) : undefined;
    const runs = scenario?.runs ?? [];
    const [selectedId, setSelectedId] = useState<string | null>(runs[0]?.id ?? null);

    const actionMap = useMemo(
        () => new Map<string, AutomationAction>((scenario?.automation.actions ?? []).map(a => [a.id, a])),
        [scenario]
    );

    const visible = useMemo(() => runs.filter((run) => {
        const matchesFilter = filter === 'all' || run.status === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery = run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
    }), [runs, filter, query]);

    const goBack = () => navigate(toVersioned('/automations-proto/dashboard'));

    if (!scenario) {
        return <NotFound onBack={goBack} />;
    }

    const {automation, metrics} = scenario;
    const selected = runs.find(r => r.id === selectedId) ?? visible[0] ?? runs[0] ?? null;
    const isEmpty = runs.length === 0;

    const slicedPoints = metrics.enrollments_by_day.slice(-Number(range));
    const chartMax = Math.max(...slicedPoints.map(p => p.count), 1);
    const chartData: GhAreaChartDataItem[] = slicedPoints.map(point => ({
        date: point.date,
        value: point.count,
        formattedValue: formatNumber(point.count),
        label: 'Enrollments'
    }));

    const stepTitle = (actionId: string): string => {
        const action = actionMap.get(actionId);
        if (!action) {
            return 'Step';
        }
        return action.type === 'send_email' ? `Email: “${action.data.email_subject}”` : `Wait ${formatWait(action.data.wait_hours)}`;
    };

    const cards: TimelineCardData[] = selected
        ? [
            {title: 'Trigger: enrollment', subtitle: fmtDateTime(selected.enrolled_at), state: 'done'},
            ...selected.steps.map((step) => {
                let subtitle = step.detail ?? '';
                if (!step.detail && step.state === 'upcoming') {
                    subtitle = 'Not reached';
                } else if (!step.detail && step.state === 'skipped') {
                    subtitle = 'Skipped';
                }
                return {title: stepTitle(step.action_id), subtitle, state: step.state};
            })
        ]
        : [];

    const terminal = selected && (
        selected.status === 'exited_early'
            ? {label: selected.exit_reason ? `Exited early · ${selected.exit_reason}` : 'Exited early', className: 'text-orange'}
            : selected.status === 'completed'
                ? {label: 'Complete', className: 'text-green'}
                : {label: 'Complete', className: 'text-muted-foreground'}
    );

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background" data-testid="dashboard-detail">
            {/* Header — borrowed from the canvas concept */}
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-surface-elevated px-4">
                <Inline align="center" gap="md">
                    <Button aria-label="Back to automations" size="icon" variant="ghost" onClick={goBack}>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Button>
                    <span className="font-medium">{automation.name}</span>
                </Inline>
                <Inline align="center" gap="sm">
                    <Button aria-label="Settings" size="icon" variant="ghost">
                        <LucideIcon.Settings strokeWidth={2} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-label="More actions" size="icon" variant="ghost">
                                <LucideIcon.MoreHorizontal strokeWidth={2} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <LucideIcon.Play /> Test
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <LucideIcon.Copy /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <LucideIcon.Trash2 /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" onClick={() => navigate(toVersioned(`/automations-proto/canvas/${id ?? ''}`))}>Edit automation</Button>
                </Inline>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <Container className="p-6 lg:p-8" size="page">
                    <Stack gap="2xl">
                        {/* Metric tiles */}
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <MetricTile label="Enrollments" sub={relEnrolled(metrics.last_enrolled_at)} value={metrics.enrollments} />
                            <MetricTile dot={runStatusMeta.in_progress.dot} label="In progress" sub={`${pct(metrics.in_progress, metrics.enrollments)}% of enrolled`} value={metrics.in_progress} />
                            <MetricTile dot={runStatusMeta.completed.dot} label="Completed" sub={`${pct(metrics.completed, metrics.enrollments)}% completion rate`} value={metrics.completed} />
                            <MetricTile dot={runStatusMeta.exited_early.dot} label="Exited early" sub={`${pct(metrics.exited_early, metrics.enrollments)}% of enrolled`} value={metrics.exited_early} />
                        </div>

                        {/* Enrollments chart */}
                        <Box className="rounded-xl border border-border-default bg-surface-elevated" padding="xl">
                            <Stack gap="lg">
                                <Inline align="center" gap="md" justify="between">
                                    <span className="text-lg font-semibold">Enrollments</span>
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
                                </Inline>
                                <GhAreaChart
                                    className="h-48 w-full"
                                    color="var(--chart-blue)"
                                    data={chartData}
                                    id={`enrollments-${automation.id}`}
                                    range={slicedPoints.length}
                                    yAxisRange={[0, chartMax]}
                                />
                            </Stack>
                        </Box>

                        {/* Member runs */}
                        {isEmpty ? (
                            <Box className="rounded-xl border border-dashed border-border-default" padding="2xl">
                                <EmptyIndicator
                                    description="Member runs will appear here once people start enrolling."
                                    title="No one has entered this automation yet"
                                />
                            </Box>
                        ) : (
                            <Stack gap="lg">
                                <Inline align="center" gap="md" justify="between" wrap>
                                    <div className="relative min-w-64 flex-1">
                                        <LucideIcon.Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input className="pl-9" placeholder="Search members…" value={query} onChange={e => setQuery(e.target.value)} />
                                    </div>
                                    <TableFilterTabs selectedTab={filter} onTabChange={value => setFilter(value as FilterKey)}>
                                        <TableFilterTab value="all">{`All ${formatNumber(metrics.enrollments)}`}</TableFilterTab>
                                        <TableFilterTab value="in_progress">{`In progress ${formatNumber(metrics.in_progress)}`}</TableFilterTab>
                                        <TableFilterTab value="completed">{`Completed ${formatNumber(metrics.completed)}`}</TableFilterTab>
                                        <TableFilterTab value="exited_early">{`Exited early ${formatNumber(metrics.exited_early)}`}</TableFilterTab>
                                    </TableFilterTabs>
                                </Inline>

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
                                    {/* Member list */}
                                    <Stack gap="sm">
                                        {visible.length === 0 && (
                                            <div className="rounded-lg border border-border-default p-5 text-sm text-muted-foreground">No members match.</div>
                                        )}
                                        {visible.map((run) => {
                                            const isSelected = run.id === selected?.id;
                                            return (
                                                <button
                                                    key={run.id}
                                                    aria-pressed={isSelected}
                                                    className={`w-full rounded-lg border p-4 text-left transition-colors ${isSelected ? 'border-border-default bg-muted' : 'border-transparent hover:bg-table-row-hover'}`}
                                                    type="button"
                                                    onClick={() => setSelectedId(run.id)}
                                                >
                                                    <Stack gap="xs">
                                                        <Inline align="center" gap="sm" justify="between">
                                                            <span className="font-semibold">{run.member.name}</span>
                                                            <span className={`text-sm font-medium ${runStatusMeta[run.status].text}`}>{runStatusMeta[run.status].label}</span>
                                                        </Inline>
                                                        <span className="text-sm text-muted-foreground">{memberMeta(run)}</span>
                                                    </Stack>
                                                </button>
                                            );
                                        })}
                                    </Stack>

                                    {/* Selected member journey (linear for now — pannable canvas is the next step) */}
                                    <Box className="rounded-xl border border-border-default bg-surface-elevated" padding="lg">
                                        {cards.map((card, i) => (
                                            <TimelineCard key={i} card={card} />
                                        ))}
                                        {terminal && <div className={`py-3 text-center text-sm font-medium ${terminal.className}`}>{terminal.label}</div>}
                                    </Box>
                                </div>
                            </Stack>
                        )}
                    </Stack>
                </Container>
            </div>
        </div>
    );
};

export default AutomationDashboard;
export const Component = AutomationDashboard;
