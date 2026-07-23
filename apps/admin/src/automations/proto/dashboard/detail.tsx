import React, {useMemo, useState} from 'react';
import type {AutomationAction} from '@tryghost/admin-x-framework/api/automations';
import {Avatar, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, InputGroup, InputGroupAddon, InputGroupInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList} from '@tryghost/shade/components';
import {Box, Container, Inline, Stack} from '@tryghost/shade/primitives';
import {DetailPage} from '@tryghost/shade/page-templates';
import {GhAreaChart, KpiTabTrigger, KpiTabValue, PageHeader, TableFilterTab, TableFilterTabs} from '@tryghost/shade/patterns';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import {Link, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {type MetricKey, type RunStatus, type RunStepState, getScenario, metricSeries} from '@/automations/proto/shared/mock';
import {seriesDiff, toAreaData} from '@/automations/proto/shared/chart';
import {runProgress} from '@/automations/proto/shared/member-runs';
import {StatusPill} from '@/automations/proto/shared/status-pill';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

// The four funnel metrics, in tile/tab order. Each drives one KPI tab: the tile
// label + value, the trend badge, and the chart colour when it's selected.
const METRIC_TABS: {key: MetricKey; label: string; color: string}[] = [
    {key: 'enrollments', label: 'Enrollments', color: 'var(--chart-darkblue)'},
    {key: 'in_progress', label: 'In progress', color: 'var(--chart-blue)'},
    {key: 'completed', label: 'Completed', color: 'var(--chart-green)'},
    {key: 'exited_early', label: 'Exited early', color: 'var(--chart-orange)'}
];

const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

const formatWait = (hours: number): string => {
    if (hours % 24 === 0) {
        const days = hours / 24;
        return `${days} day${days === 1 ? '' : 's'}`;
    }
    return `${hours} hour${hours === 1 ? '' : 's'}`;
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

type TimelineCardData = {title: string; subtitle: string; state: RunStepState; icon: React.ElementType};

// A journey moment: an icon, a title, and an optional detail/time line below.
// `muted` dims steps the member hasn't reached yet (skipped / upcoming).
type Moment = {icon: React.ElementType; title: string; subtitle?: string; muted?: boolean};

// One journey row, styled after the member Activity feed
// (members/detail/member-activity-feed.tsx): a muted circular icon chip + title,
// with the timestamp/detail on a line below. Rows are separated by the parent's
// divide-y — no per-row border or connector rail.
const TimelineMoment: React.FC<{moment: Moment}> = ({moment}) => {
    const {icon: Icon, title, subtitle, muted} = moment;
    return (
        <div className="flex items-start gap-3 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn('truncate text-sm leading-snug', muted ? 'text-muted-foreground' : 'text-foreground')}>{title}</span>
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type FilterKey = 'all' | RunStatus;

const NotFound: React.FC<{onBack: () => void}> = ({onBack}) => (
    <Box className="size-full">
        <Container className="flex h-full flex-col items-center justify-center gap-4" size="page">
            <EmptyIndicator title="Automation not found" />
            <Button variant="outline" onClick={onBack}>Back to automations</Button>
        </Container>
    </Box>
);

const AutomationDashboard: React.FC = () => {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const toVersioned = useVersionLink();
    const [filter, setFilter] = useState<FilterKey>('all');
    const [query, setQuery] = useState('');
    const [range, setRange] = useState('30');
    const [metricTab, setMetricTab] = useState<MetricKey>('enrollments');

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

    // Chart follows the selected KPI tab: its own (derived) daily series, shaped
    // via the shared helper both concepts use.
    const activeMetric = METRIC_TABS.find(m => m.key === metricTab) ?? METRIC_TABS[0];
    const chartData = toAreaData(metricSeries(metrics, metricTab), {range: Number(range), label: activeMetric.label});
    const chartMax = Math.max(...chartData.map(point => point.value), 1);

    // Title + type icon for a step, mirroring the activity feed's per-type icons
    // (Send for email, Clock for wait).
    const stepMeta = (actionId: string): {title: string; icon: React.ElementType} => {
        const action = actionMap.get(actionId);
        if (!action) {
            return {title: 'Step', icon: LucideIcon.Circle};
        }
        return action.type === 'send_email'
            ? {title: `Email: “${action.data.email_subject}”`, icon: LucideIcon.Send}
            : {title: `Wait ${formatWait(action.data.wait_hours)}`, icon: LucideIcon.Clock};
    };

    const cards: TimelineCardData[] = selected
        ? [
            {title: 'Trigger: enrollment', subtitle: fmtDateTime(selected.enrolled_at), state: 'done', icon: LucideIcon.UserPlus},
            ...selected.steps.map((step) => {
                const {title, icon} = stepMeta(step.action_id);
                let subtitle = step.detail ?? '';
                if (!step.detail && step.state === 'upcoming') {
                    subtitle = 'Not reached';
                } else if (!step.detail && step.state === 'skipped') {
                    subtitle = 'Skipped';
                }
                return {title, subtitle, state: step.state, icon};
            })
        ]
        : [];

    // The run's terminal state, rendered as the feed's final row.
    const terminalMoment: Moment | null = selected && (
        selected.status === 'exited_early'
            ? {icon: LucideIcon.CircleSlash, title: selected.exit_reason ? `Exited early · ${selected.exit_reason}` : 'Exited early'}
            : selected.status === 'completed'
                ? {icon: LucideIcon.CircleCheck, title: 'Complete'}
                : {icon: LucideIcon.Flag, title: 'Complete', muted: true}
    );

    const moments: Moment[] = [
        ...cards.map(card => ({
            icon: card.icon,
            title: card.title,
            subtitle: card.subtitle || undefined,
            muted: card.state === 'skipped' || card.state === 'upcoming'
        })),
        ...(terminalMoment ? [terminalMoment] : [])
    ];

    return (
        <Box className="size-full" data-testid="dashboard-detail">
            <Container className="relative flex h-full flex-col" size="page">
                <DetailPage>
                    <DetailPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                {/*
                                  * Breadcrumb sits directly under Left rather than inside
                                  * PageHeader.Breadcrumb — that slot adds a `pt-1` offset that
                                  * only makes sense when a title stacks below it. Mirrors the
                                  * members detail page.
                                  */}
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem>
                                            <BreadcrumbLink asChild>
                                                <Link to={toVersioned('/automations-proto/dashboard')}>Automations</Link>
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>
                                        <BreadcrumbSeparator />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage className="truncate">{automation.name}</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </PageHeader.Left>
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
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
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>
                    </DetailPage.Header>
                    <DetailPage.Body>
                        <Stack gap="2xl">
                            {/* Metrics — each tile doubles as a tab; the chart below switches to match */}
                            <Stack gap="lg">
                                <Inline align="center" justify="end">
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
                                <Box className="rounded-xl border border-border-default bg-surface-elevated px-6">
                                    <Tabs value={metricTab} variant="kpis" onValueChange={value => setMetricTab(value as MetricKey)}>
                                        <TabsList className="-mx-6 grid grid-cols-2 md:grid-cols-4">
                                            {METRIC_TABS.map(({key, label, color}) => {
                                                const diff = seriesDiff(metricSeries(metrics, key));
                                                return (
                                                    <KpiTabTrigger key={key} value={key}>
                                                        <KpiTabValue
                                                            color={color}
                                                            diffDirection={diff.direction}
                                                            diffValue={diff.value}
                                                            label={label}
                                                            value={formatNumber(metrics[key])}
                                                        />
                                                    </KpiTabTrigger>
                                                );
                                            })}
                                        </TabsList>
                                        <div className="my-4">
                                            <GhAreaChart
                                                className="h-48 w-full"
                                                color={activeMetric.color}
                                                data={chartData}
                                                id={`metric-${automation.id}-${metricTab}`}
                                                range={chartData.length}
                                                yAxisRange={[0, chartMax]}
                                            />
                                        </div>
                                    </Tabs>
                                </Box>
                            </Stack>

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
                                        <InputGroup className="min-w-64 flex-1">
                                            <InputGroupAddon>
                                                <LucideIcon.Search />
                                            </InputGroupAddon>
                                            <InputGroupInput placeholder="Search members…" value={query} onChange={e => setQuery(e.target.value)} />
                                        </InputGroup>
                                        <TableFilterTabs selectedTab={filter} onTabChange={value => setFilter(value as FilterKey)}>
                                            <TableFilterTab value="all">{`All ${formatNumber(metrics.enrollments)}`}</TableFilterTab>
                                            <TableFilterTab value="in_progress">{`In progress ${formatNumber(metrics.in_progress)}`}</TableFilterTab>
                                            <TableFilterTab value="completed">{`Completed ${formatNumber(metrics.completed)}`}</TableFilterTab>
                                            <TableFilterTab value="exited_early">{`Exited early ${formatNumber(metrics.exited_early)}`}</TableFilterTab>
                                        </TableFilterTabs>
                                    </Inline>

                                    {/* Master–detail: the member table and timeline split the row 50/50. Flex
                                        (not a grid track) + table-fixed so the table's intrinsic width can never
                                        blow out and overlap the timeline; both sides truncate to their half. */}
                                    <div className="flex flex-col gap-6 lg:flex-row">
                                        {/* Member list — standard Shade table, mirrors the surface Runs tab */}
                                        <div className="w-full min-w-0 lg:flex-1">
                                            <Table className="table-fixed" data-testid="dashboard-runs-table">
                                                <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="px-4">Member</TableHead>
                                                        <TableHead className="w-32 px-4 text-right">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {visible.length === 0 && (
                                                        <TableRow className="hover:bg-transparent">
                                                            <TableCell className="py-6 text-center text-sm text-muted-foreground" colSpan={2}>No members match.</TableCell>
                                                        </TableRow>
                                                    )}
                                                    {visible.map((run) => {
                                                        const isSelected = run.id === selected?.id;
                                                        return (
                                                            <TableRow
                                                                key={run.id}
                                                                aria-selected={isSelected}
                                                                className={cn('cursor-pointer', isSelected ? 'bg-muted' : 'hover:bg-table-row-hover')}
                                                                onClick={() => setSelectedId(run.id)}
                                                            >
                                                                <TableCell className="min-w-0 px-4 py-3">
                                                                    <div className="flex min-w-0 items-center gap-3">
                                                                        <Avatar className="size-8 min-w-8" email={run.member.email} name={run.member.name} />
                                                                        <div className="min-w-0">
                                                                            <span className={cn('block truncate text-md', isSelected ? 'font-semibold' : 'font-medium')}>{run.member.name}</span>
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

                                        {/* Selected member journey — styled after the member Activity feed */}
                                        <Box className="min-w-0 flex-1 rounded-xl border border-border-default bg-surface-elevated" padding="lg">
                                            <div className="divide-y divide-border">
                                                {moments.map((moment, i) => (
                                                    <TimelineMoment key={i} moment={moment} />
                                                ))}
                                            </div>
                                        </Box>
                                    </div>
                                </Stack>
                            )}
                        </Stack>
                    </DetailPage.Body>
                </DetailPage>
            </Container>
        </Box>
    );
};

export default AutomationDashboard;
export const Component = AutomationDashboard;
