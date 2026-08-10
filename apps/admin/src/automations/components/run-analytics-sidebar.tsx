import React, {useMemo, useState} from 'react';
import type {Automation} from '@tryghost/admin-x-framework/api/automations';
import {useBrowseAutomationRunAnalytics} from '@tryghost/admin-x-framework/api/automations';
import {Card, CardContent, MetricValue, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Grid, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';

// Running has no fitting fixed Lucide glyph; this is the custom progress ring
// lifted from the original prototype. The arc uses stroke-current so the caller
// tints it via text-*, over a muted track.
const ProgressRing: React.FC<{value?: number; className?: string}> = ({value = 70, className}) => {
    const radius = 7;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);
    return (
        <svg className={cn('size-4 shrink-0 -rotate-90', className)} fill="none" viewBox="0 0 18 18">
            <circle className="stroke-muted-foreground/30" cx="9" cy="9" r={radius} strokeWidth="1.5" />
            <circle className="stroke-current" cx="9" cy="9" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="1.5" />
        </svg>
    );
};

const MetricTile: React.FC<{label: string; value: number; icon: React.ReactNode}> = ({label, value, icon}) => (
    <Card className="bg-transparent">
        <CardContent className="px-6 py-5">
            <MetricValue
                label={(
                    <>
                        {icon}
                        {label}
                    </>
                )}
                value={formatNumber(value)}
            />
        </CardContent>
    </Card>
);

const RunAnalyticsSidebar: React.FC<{automation: Automation}> = ({automation}) => {
    const [range, setRange] = useState('30');
    const {data} = useBrowseAutomationRunAnalytics({
        searchParams: {
            automation_id: automation.id,
            include: 'series'
        }
    });
    const metrics = data?.automation_run_analytics[0];
    const chartData = useMemo(() => (metrics?.runs_by_day ?? []).slice(-Number(range)).map(point => ({
        date: point.date,
        formattedValue: formatNumber(point.count),
        label: 'Runs',
        value: point.count
    })), [metrics?.runs_by_day, range]);
    const chartMax = Math.max(...chartData.map(point => point.value), 1);

    return (
        <aside className="w-[400px] shrink-0 overflow-y-auto border-r border-border-default bg-surface-elevated px-6 py-5" data-testid="run-analytics-sidebar">
            <Stack gap="lg">
                <Inline align="center" justify="between">
                    <Text weight="semibold">Performance</Text>
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-auto">
                            <LucideIcon.Calendar className="mr-2" size={16} strokeWidth={1.5} />
                            <SelectValue placeholder="Select a period" />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectGroup>
                                <SelectLabel>Period</SelectLabel>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Inline>

                <Card className="bg-transparent">
                    <CardContent className="px-6 py-5">
                        <Stack gap="sm">
                            <MetricValue
                                label={(
                                    <>
                                        <LucideIcon.Zap size={16} strokeWidth={1.5} />
                                        Total runs
                                    </>
                                )}
                                value={formatNumber(metrics?.total_runs ?? 0)}
                            />
                            <GhAreaChart
                                className="h-56 w-full"
                                color="var(--chart-blue)"
                                data={chartData}
                                id={`automation-runs-${automation.id}`}
                                range={chartData.length}
                                showYAxisValues={false}
                                yAxisRange={[0, chartMax]}
                            />
                        </Stack>
                    </CardContent>
                </Card>

                <Grid className="grid-cols-2" gap="lg">
                    <MetricTile icon={<ProgressRing className="text-chart-blue" />} label="Running" value={metrics?.in_progress ?? 0} />
                    <MetricTile icon={<LucideIcon.Check className="text-chart-green" size={16} strokeWidth={1.5} />} label="Done" value={metrics?.completed ?? 0} />
                </Grid>
            </Stack>
        </aside>
    );
};

export default RunAnalyticsSidebar;
