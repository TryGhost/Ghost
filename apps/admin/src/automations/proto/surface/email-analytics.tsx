import React from 'react';
import type {AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {type ChartConfig, ChartContainer, Separator} from '@tryghost/shade/components';
import {Recharts, cn, formatNumber, formatPercentage} from '@tryghost/shade/utils';
import {formatRate} from '@/automations/components/canvas/format-stats';
import {OffValue} from '@/automations/components/canvas/off-value';

// Email analytics for the surface concept — hybrid with the real editor.
//
// Reuses the shipped editor's shared, presentational bits verbatim (OffValue,
// formatRate) and the same Shade chart/recharts building blocks, but is
// proto-owned and driven by each email's own `action.stats`, so numbers vary per
// email and stay consistent between the node footer and the sidebar. Mirrors
// apps/admin/src/automations/components/canvas (EmailStepStatsFooter +
// email-performance-section). Kept thin: no /members links, hover-swaps, or the
// "Top clicked links" list (those need invented URLs) — easy to add later.

interface StatsProps {
    stats: AutomationEmailStats;
    opensTracked?: boolean;
    clicksTracked?: boolean;
}

// --- Node stats footer -----------------------------------------------------

// Tracked → the value; not tracked → a muted, inert "Off" that keeps the column
// in place (distinct from formatRate's "--" = no data yet).
const FooterMetric: React.FC<{label: string; tracked: boolean; children: React.ReactNode}> = ({label, tracked, children}) => (
    <div className="flex flex-col gap-1 text-left">
        {/* Small muted label; value at 14px (text-md) foreground. */}
        <span className="text-xs text-muted-foreground">{label}</span>
        {tracked
            ? <span className="text-md text-foreground tabular-nums">{children}</span>
            : <OffValue className="text-md" />}
    </div>
);

export const EmailStatsFooter: React.FC<StatsProps & {divider?: boolean}> = ({stats, opensTracked = true, clicksTracked = true, divider = true}) => (
    // divider (read canvas): border-t separating stats from the header above. Without it
    // (email preview) we drop the border and hold a 24px gap to the element above.
    <div className={cn('grid w-full grid-cols-3 gap-3', divider ? 'mt-3 border-t border-border-default pt-3' : 'mt-[24px]')}>
        <FooterMetric label="Sent" tracked={true}>{formatNumber(stats.email_sent_count)}</FooterMetric>
        <FooterMetric label="Opened" tracked={opensTracked}>{formatRate(stats.opened_rate)}</FooterMetric>
        <FooterMetric label="Clicked" tracked={clicksTracked}>{formatRate(stats.clicked_rate)}</FooterMetric>
    </div>
);

// --- Sidebar performance section -------------------------------------------

const RING_CHART_CONFIG = {value: {label: 'Rate'}} satisfies ChartConfig;

const RING_RADII = {
    sent: {innerRadius: 88, outerRadius: 110},
    opened: {innerRadius: 63, outerRadius: 85},
    clicked: {innerRadius: 38, outerRadius: 60}
};

// One ring of the nested donut. When `tracked` is false it renders as a faded
// empty track — "present but not measured" — so "tracking off" never reads as 0%.
const PerformanceRing: React.FC<{
    datatype: string;
    value: number;
    color: 'purple' | 'blue' | 'teal';
    innerRadius: number;
    outerRadius: number;
    tracked?: boolean;
}> = ({datatype, value, color, innerRadius, outerRadius, tracked = true}) => {
    const gradientId = `protoEmailRing-${color}`;
    const colorVar = `var(--chart-${color})`;
    return (
        <ChartContainer className={`absolute inset-0 aspect-square ${tracked ? '' : 'opacity-30'}`} config={RING_CHART_CONFIG}>
            <Recharts.RadialBarChart
                data={[{datatype, value: tracked ? value : 0}]}
                endAngle={-270}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={90}
            >
                <defs>
                    <radialGradient cx="30%" cy="30%" id={gradientId} r="70%">
                        <stop offset="0%" stopColor={colorVar} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={colorVar} stopOpacity={1} />
                    </radialGradient>
                </defs>
                <Recharts.PolarAngleAxis angleAxisId={0} domain={[0, 1]} tick={false} type="number" />
                <Recharts.RadialBar
                    angleAxisId={0}
                    cornerRadius={10}
                    dataKey="value"
                    fill={`url(#${gradientId})`}
                    minPointSize={-2}
                    background
                >
                    <Recharts.LabelList
                        className="fill-foreground opacity-60"
                        dataKey="datatype"
                        fontSize={11}
                        position="insideStart"
                    />
                </Recharts.RadialBar>
            </Recharts.RadialBarChart>
        </ChartContainer>
    );
};

const PerformanceChart: React.FC<{openRate: number; clickRate: number; opensTracked: boolean; clicksTracked: boolean}> = ({openRate, clickRate, opensTracked, clicksTracked}) => (
    <div className="relative mx-auto aspect-square size-[240px]">
        <PerformanceRing color="purple" datatype="Sent" innerRadius={RING_RADII.sent.innerRadius} outerRadius={RING_RADII.sent.outerRadius} value={1} />
        <PerformanceRing color="blue" datatype="Opened" innerRadius={RING_RADII.opened.innerRadius} outerRadius={RING_RADII.opened.outerRadius} tracked={opensTracked} value={openRate} />
        <PerformanceRing color="teal" datatype="Clicked" innerRadius={RING_RADII.clicked.innerRadius} outerRadius={RING_RADII.clicked.outerRadius} tracked={clicksTracked} value={clickRate} />
    </div>
);

const KpiDot: React.FC<{color: string}> = ({color}) => (
    <span aria-hidden="true" className="size-2 rounded-full" style={{backgroundColor: color}} />
);

const Kpi: React.FC<{label: string; color: string; tracked?: boolean; children: React.ReactNode}> = ({label, color, tracked = true, children}) => (
    <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
            <KpiDot color={tracked ? color : 'var(--muted-foreground)'} />
            {label}
        </span>
        {tracked
            ? <span className="text-xl font-semibold tracking-tight tabular-nums">{children}</span>
            : <OffValue className="text-xl" />}
    </div>
);

export const EmailPerformance: React.FC<StatsProps> = ({stats, opensTracked = true, clicksTracked = true}) => {
    // Mock rates are whole percentages (0–100); the donut wants 0–1.
    const openRate = (stats.opened_rate ?? 0) / 100;
    const clickRate = (stats.clicked_rate ?? 0) / 100;
    return (
        <div className="flex flex-col gap-5">
            <Separator />
            <div className="flex flex-col gap-5">
                <h3 className="text-sm font-medium text-text-secondary">Email performance</h3>
                <div className="grid grid-cols-3 gap-4">
                    <Kpi color="var(--chart-purple)" label="Sent">{formatNumber(stats.email_sent_count)}</Kpi>
                    <Kpi color="var(--chart-blue)" label="Opened" tracked={opensTracked}>{formatPercentage(openRate)}</Kpi>
                    <Kpi color="var(--chart-teal)" label="Clicked" tracked={clicksTracked}>{formatPercentage(clickRate)}</Kpi>
                </div>
                <PerformanceChart clickRate={clickRate} clicksTracked={clicksTracked} openRate={openRate} opensTracked={opensTracked} />
            </div>
        </div>
    );
};
