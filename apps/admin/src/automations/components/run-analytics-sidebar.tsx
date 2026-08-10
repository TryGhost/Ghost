import React, {useMemo, useState} from 'react';
import type {Automation} from '@tryghost/admin-x-framework/api/automations';
import {useBrowseAutomationRunAnalytics} from '@tryghost/admin-x-framework/api/automations';
import {MetricValue, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Box, Grid, Inline, Stack, Text} from '@tryghost/shade/primitives';
import {GhAreaChart} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';

const MetricTile: React.FC<{label: string; value: number; color: string}> = ({label, value, color}) => (
    <Box className="rounded-lg border border-border-default" padding="md">
        <MetricValue
            label={(
                <>
                    <span className={`size-2 rounded-full ${color}`} />
                    {label}
                </>
            )}
            value={formatNumber(value)}
        />
    </Box>
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
        <aside className="w-[480px] shrink-0 overflow-y-auto border-r border-border-default bg-sidebar px-6 py-5" data-testid="run-analytics-sidebar">
            <Stack gap="md">
                <Inline align="center" justify="between">
                    <Text weight="semibold">Performance</Text>
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-36 shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                        </SelectContent>
                    </Select>
                </Inline>

                <Box className="rounded-lg border border-border-default" padding="md">
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
                </Box>

                <Grid className="grid-cols-2" gap="md">
                    <MetricTile color="bg-chart-blue" label="In progress" value={metrics?.in_progress ?? 0} />
                    <MetricTile color="bg-chart-green" label="Completed" value={metrics?.completed ?? 0} />
                </Grid>
            </Stack>
        </aside>
    );
};

export default RunAnalyticsSidebar;
