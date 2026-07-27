import React, {useMemo, useState} from 'react';
import type {AutomationAction} from '@tryghost/admin-x-framework/api/automations';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyIndicator, InputGroup, InputGroupAddon, InputGroupInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableRow, Tabs, TabsList} from '@tryghost/shade/components';
import {Box, Container, Inline, Stack} from '@tryghost/shade/primitives';
import {DetailPage} from '@tryghost/shade/page-templates';
import {GhAreaChart, KpiTabTrigger, KpiTabValue, PageHeader} from '@tryghost/shade/patterns';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import {Link, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {type MetricKey, type RunStatus, type RunStep, getScenario, metricSeries} from '@/automations/proto/shared/mock';
import {seriesDiff, toAreaData} from '@/automations/proto/shared/chart';
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

// e.g. "Jul 9, 2:34 PM" — year omitted for now while the concept settles.
const fmtActivityTime = (iso: string): string => new Date(iso).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});

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

// A journey row: a colored icon chip (signals the moment's status at a glance),
// one human-readable sentence with the timestamp appended inline, and a
// connecting line down to the next row. `muted` dims steps the member hasn't
// reached yet.
type MomentTone = 'positive' | 'active' | 'negative' | 'neutral';

type Moment = {icon: React.ElementType; tone: MomentTone; content: string; time?: string; muted?: boolean};

const momentToneStyles: Record<MomentTone, string> = {
    positive: 'bg-green text-white',
    active: 'bg-blue text-white',
    negative: 'bg-orange text-white',
    neutral: 'bg-muted text-muted-foreground'
};

const TimelineMoment: React.FC<{moment: Moment; isLast: boolean}> = ({moment, isLast}) => {
    const {icon: Icon, tone, content, time, muted} = moment;
    return (
        <div className={cn('relative flex items-center gap-3', isLast ? 'pb-0' : 'pb-6')}>
            <span className={cn('relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full', momentToneStyles[tone])}>
                <Icon className="size-3.5" strokeWidth={2} />
            </span>
            {/* Connector down to the next row's icon — spans from this icon's
                bottom edge (top-7 = its height) to the row's bottom, i.e. through
                the pb-6 gap, so it lines up with the next icon regardless of
                spacing tweaks. */}
            {!isLast && <span className="absolute top-7 bottom-0 left-3.5 w-px bg-border-default" />}
            <div className={cn('min-w-0 flex-1 truncate text-sm', muted ? 'text-muted-foreground' : 'text-foreground')}>
                {content}
                {time && <span className="text-muted-foreground"> · {time}</span>}
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

    // Each step as a human sentence with bolded action words. Derived from the
    // step's type + state + detail.
    const stepMoment = (step: RunStep): Moment => {
        const action = actionMap.get(step.action_id);
        const time = step.occurred_at ? fmtActivityTime(step.occurred_at) : undefined;
        const muted = step.state === 'upcoming';

        // Default by state: done → green (it happened), current → blue
        // (in progress), upcoming → neutral grey. Only an explicit negative
        // outcome (unsubscribed) overrides this to orange below.
        const stateTone: MomentTone = step.state === 'current' ? 'active' : step.state === 'done' ? 'positive' : 'neutral';

        if (action?.type === 'wait') {
            const wait = formatWait(action.data.wait_hours);
            return step.state === 'current'
                ? {icon: LucideIcon.Clock, tone: stateTone, content: `Waiting ${wait}`, time, muted}
                : {icon: LucideIcon.Clock, tone: stateTone, content: `Waited ${wait}`, time, muted};
        }

        if (action?.type === 'send_email') {
            const subject = action.data.email_subject || 'Untitled';
            const label = `email “${subject}”`;
            const detail = step.detail ?? '';
            if (detail.includes('Unsubscribed')) {
                return {icon: LucideIcon.MailMinus, tone: 'negative', content: 'Unsubscribed', time, muted};
            }
            if (detail.includes('clicked')) {
                return {icon: LucideIcon.MailOpen, tone: stateTone, content: `Opened ${label} and clicked a link`, time, muted};
            }
            if (detail.includes('Opened')) {
                return {icon: LucideIcon.MailOpen, tone: stateTone, content: `Opened ${label}`, time, muted};
            }
            if (detail.includes('Delivered')) {
                return {icon: LucideIcon.Mail, tone: stateTone, content: `Did not open ${label}`, time, muted};
            }
            if (step.state === 'current') {
                return {icon: LucideIcon.Send, tone: stateTone, content: `Sending ${label}`, time, muted};
            }
            return {icon: LucideIcon.Mail, tone: 'neutral', content: `Email “${subject}” not sent yet`, time, muted};
        }

        return {icon: LucideIcon.Circle, tone: 'neutral', content: 'Step', time, muted};
    };

    // Trigger, then each step (skipped ones hidden so the story reads cleanly to
    // an early exit), then a terminal row for completed runs.
    const moments: Moment[] = selected
        ? [
            {icon: LucideIcon.UserPlus, tone: 'positive', content: 'Signed up to newsletter', time: fmtActivityTime(selected.enrolled_at)},
            ...selected.steps.filter(step => step.state !== 'skipped').map(stepMoment),
            ...(selected.status === 'completed'
                ? [{icon: LucideIcon.CircleCheck, tone: 'positive' as const, content: 'Completed the automation', time: selected.completed_at ? fmtActivityTime(selected.completed_at) : undefined}]
                : [])
        ]
        : [];

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
                                                className="h-[270px] w-full"
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
                                    <Inline align="center" className="flex-wrap" gap="md" justify="between">
                                        <h3 className="text-lg font-semibold">Member runs</h3>
                                        <Inline align="center" gap="sm">
                                            <InputGroup className="w-64">
                                                <InputGroupAddon>
                                                    <LucideIcon.Search />
                                                </InputGroupAddon>
                                                <InputGroupInput placeholder="Search members…" value={query} onChange={e => setQuery(e.target.value)} />
                                            </InputGroup>
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
                                    </Inline>
                                    {/* One card: the member list and the selected member's journey, split by
                                        a divider — one connected surface. */}
                                    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-elevated">
                                        <div className="flex flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
                                            {/* Left — member list. Fixed width (not flex-1) so the table can't
                                                blow out; the journey column takes the rest via min-w-0 flex-1. */}
                                            <div className="flex w-full min-w-0 flex-col lg:w-[400px] lg:shrink-0">
                                                <Table className="table-fixed" data-testid="dashboard-runs-table">
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
                                                                    <TableCell className="min-w-0 px-6 py-3">
                                                                        <span className={cn('block truncate', isSelected ? 'font-semibold' : 'font-medium')}>{run.member.name}</span>
                                                                    </TableCell>
                                                                    <TableCell className="w-32 px-6 py-3 text-right"><StatusPill status={run.status} /></TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {/* Right — selected member header (avatar, name, email), then the
                                                journey (member Activity feed style). flex flex-col + h-full on the
                                                journey wrapper so this column stretches to the full section height,
                                                matching the left column, rather than only its content. */}
                                            <div className="flex min-w-0 flex-col lg:flex-1">
                                                <div className="h-full p-6">
                                                    {selected && (
                                                        <div className="pb-6">
                                                            <span className="block truncate font-semibold">{selected.member.name}</span>
                                                            <span className="block truncate text-muted-foreground">{selected.member.email}</span>
                                                        </div>
                                                    )}
                                                    {moments.map((moment, i) => (
                                                        <TimelineMoment key={i} isLast={i === moments.length - 1} moment={moment} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
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
