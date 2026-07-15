import React from 'react';
import {ChartContainer, Separator} from '@tryghost/shade/components';
import type {ChartConfig} from '@tryghost/shade/components';
import type {AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {Recharts, formatNumber} from '@tryghost/shade/utils';
import {formatRate} from './format-stats';

const EMAIL_PERFORMANCE_CHART_CONFIG = {
    value: {label: 'Rate'}
} satisfies ChartConfig;

const EmailPerformanceRing: React.FC<{
    datatype: string;
    value: number;
    color: 'purple' | 'blue' | 'teal';
    innerRadius: number;
    outerRadius: number;
}> = ({datatype, value, color, innerRadius, outerRadius}) => {
    const gradientId = `emailRing-${color}`;
    const colorVar = `var(--chart-${color})`;
    return (
        <ChartContainer className='absolute inset-0 aspect-square' config={EMAIL_PERFORMANCE_CHART_CONFIG}>
            <Recharts.RadialBarChart
                data={[{datatype, value}]}
                endAngle={-270}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={90}
            >
                <defs>
                    <radialGradient cx='30%' cy='30%' id={gradientId} r='70%'>
                        <stop offset='0%' stopColor={colorVar} stopOpacity={0.5} />
                        <stop offset='100%' stopColor={colorVar} stopOpacity={1} />
                    </radialGradient>
                </defs>
                <Recharts.PolarAngleAxis angleAxisId={0} domain={[0, 1]} tick={false} type='number' />
                <Recharts.RadialBar
                    angleAxisId={0}
                    cornerRadius={10}
                    dataKey='value'
                    fill={`url(#${gradientId})`}
                    minPointSize={-2}
                    background
                >
                    <Recharts.LabelList
                        className='fill-foreground opacity-60'
                        dataKey='datatype'
                        fontSize={11}
                        position='insideStart'
                    />
                </Recharts.RadialBar>
            </Recharts.RadialBarChart>
        </ChartContainer>
    );
};

// Per-ring radii in px, calibrated for a 240×240 chart container. Each ring is 22px thick with a
// 3px gap. Recharts' <RadialBar> doesn't accept innerRadius/outerRadius (those live on the parent
// <RadialBarChart>), so we draw each ring with its own absolutely-positioned chart.
const EMAIL_CHART_RINGS = {
    sent: {innerRadius: 88, outerRadius: 110},
    opened: {innerRadius: 63, outerRadius: 85},
    clicked: {innerRadius: 38, outerRadius: 60}
};

const EmailPerformanceChart: React.FC<{openRate: number}> = ({openRate}) => (
    <div className='relative mx-auto aspect-square size-[240px]'>
        <EmailPerformanceRing
            color='purple'
            datatype='Sent'
            innerRadius={EMAIL_CHART_RINGS.sent.innerRadius}
            outerRadius={EMAIL_CHART_RINGS.sent.outerRadius}
            value={1}
        />
        <EmailPerformanceRing
            color='blue'
            datatype='Opened'
            innerRadius={EMAIL_CHART_RINGS.opened.innerRadius}
            outerRadius={EMAIL_CHART_RINGS.opened.outerRadius}
            value={openRate}
        />
        {/* @TODO: NY-1457 */}
        {/* <EmailPerformanceRing
            color='teal'
            datatype='Clicked'
            innerRadius={EMAIL_CHART_RINGS.clicked.innerRadius}
            outerRadius={EMAIL_CHART_RINGS.clicked.outerRadius}
            value={clickRate}
        /> */}
    </div>
);

const KPI_CLASS_NAME = 'group/kpi -mx-2 -my-1 flex flex-col gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-muted';

export const EmailPerformanceSection: React.FC<{stats: AutomationEmailStats}> = ({stats}) => (
    <div className='flex flex-col gap-5'>
        <Separator />
        <div className='flex flex-col gap-5'>
            <h3 className='text-sm font-medium tracking-normal text-text-secondary'>
                Email performance
            </h3>
            <div className='grid grid-cols-3 gap-4'>
                <div className={KPI_CLASS_NAME}>
                    <span className='flex items-center gap-1.5 text-sm text-text-secondary'>
                        <span aria-hidden='true' className='size-2 rounded-full' style={{backgroundColor: 'var(--chart-purple)'}} />
                        Sent
                    </span>
                    <span className='text-xl font-semibold tracking-tight tabular-nums'>{formatNumber(stats.email_sent_count)}</span>
                </div>
                <div className={KPI_CLASS_NAME}>
                    <span className='flex items-center gap-1.5 text-sm text-text-secondary'>
                        <span aria-hidden='true' className='size-2 rounded-full' style={{backgroundColor: 'var(--chart-blue)'}} />
                        Opened
                    </span>
                    <span className='text-xl font-semibold tracking-tight tabular-nums'>
                        <span className='group-hover/kpi:hidden'>{formatRate(stats.opened_rate)}</span>
                        <span className='hidden group-hover/kpi:inline'>{stats.email_sent_count > 0 ? formatNumber(stats.email_opened_count) : '--'}</span>
                    </span>
                </div>
                {/* @TODO: NY-1457 */}
                {/* <div className={KPI_CLASS_NAME}>
                    <span className='flex items-center gap-1.5 text-sm text-text-secondary'>
                        <span aria-hidden='true' className='size-2 rounded-full' style={{backgroundColor: 'var(--chart-teal)'}} />
                        Clicked
                    </span>
                    <span className='text-xl font-semibold tracking-tight tabular-nums'>{formatRate(stats.clicked_rate)}</span>
                </div> */}
            </div>
            <EmailPerformanceChart openRate={(stats.opened_rate ?? 0) / 100} />
        </div>
        {/* @TODO: NY-1457 */}
        {/* <Separator />
        <div className='flex items-center justify-between'>
            <span className='text-sm font-medium text-text-secondary'>Top clicked links</span>
            <span className='text-sm font-medium text-muted-foreground'>Members</span>
        </div> */}
    </div>
);
