import React, {useMemo, useState} from 'react';
import type {AutomationSendEmailAction} from '@tryghost/admin-x-framework/api/automations';
import {Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Box, Inline, Stack} from '@tryghost/shade/primitives';
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
    <Box className="rounded-lg border border-border-default" padding="md">
        <Stack gap="none">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xl font-semibold tabular-nums">{formatNumber(value)}</span>
        </Stack>
    </Box>
);

const StatusPill: React.FC<{status: RunStatus}> = ({status}) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase ${runStatusMeta[status].pill}`}>
        {runStatusMeta[status].label}
    </span>
);

const EmailsTab: React.FC<{scenario: AutomationScenario}> = ({scenario}) => {
    const emails = scenario.automation.actions.filter((a): a is AutomationSendEmailAction => a.type === 'send_email');
    return (
        <Stack gap="none">
            {emails.map((email, i) => (
                <div key={email.id} className={`flex items-center justify-between gap-3 py-3 ${i > 0 ? 'border-t border-border-default' : ''}`}>
                    <Inline align="center" className="min-w-0" gap="sm">
                        <LucideIcon.Mail className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                        <span className="truncate text-sm font-medium">{email.data.email_subject || 'Untitled'}</span>
                    </Inline>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {email.stats ? `${formatNumber(email.stats.opened_rate ?? 0)}% opened` : '—'}
                    </span>
                </div>
            ))}
        </Stack>
    );
};

type FilterKey = 'all' | RunStatus;

interface SurfaceAnalyticsPaneProps {
    scenario: AutomationScenario;
    selectedMemberId: string | null;
    onSelectMember: (runId: string) => void;
}

export const SurfaceAnalyticsPane: React.FC<SurfaceAnalyticsPaneProps> = ({scenario, selectedMemberId, onSelectMember}) => {
    const {metrics, runs} = scenario;
    const [tab, setTab] = useState('runs');
    const [filter, setFilter] = useState<FilterKey>('all');
    const [query, setQuery] = useState('');

    const visible = useMemo(() => runs.filter((run) => {
        const matchesFilter = filter === 'all' || run.status === filter;
        const q = query.trim().toLowerCase();
        const matchesQuery = run.member.name.toLowerCase().includes(q) || run.member.email.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
    }), [runs, filter, query]);

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Metrics */}
            <Stack gap="sm">
                <span className="text-sm font-semibold">Metrics</span>
                <div className="grid grid-cols-2 gap-2">
                    <MetricTile label="Total runs" value={metrics.enrollments} />
                    <MetricTile label="In progress" value={metrics.in_progress} />
                    <MetricTile label="Completed" value={metrics.completed} />
                    <MetricTile label="Exited early" value={metrics.exited_early} />
                </div>
            </Stack>

            {/* Runs / Emails */}
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="runs">Runs</TabsTrigger>
                    <TabsTrigger value="emails">Emails</TabsTrigger>
                </TabsList>

                <TabsContent className="flex flex-col gap-4" value="runs">
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
                </TabsContent>

                <TabsContent value="emails">
                    <EmailsTab scenario={scenario} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SurfaceAnalyticsPane;
