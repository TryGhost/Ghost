// Email performance panel — three rings + KPI tiles + "Top clicked links".
// `opensTracked` / `clicksTracked` drive the tracking-off treatment. Counts and
// links use placeholder data; real data comes from `action.stats`.
import React from 'react';
import {Link} from '@tryghost/admin-x-framework';
import {
    type ChartConfig,
    ChartContainer,
    DataList,
    DataListBar,
    DataListBody,
    DataListItemContent,
    DataListItemValue,
    DataListItemValueAbs,
    DataListItemValuePerc,
    DataListRow,
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
    Separator,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@tryghost/shade/components';
import {LucideIcon, Recharts, formatNumber, formatPercentage} from '@tryghost/shade/utils';
import {OffValue} from './off-value';

// Placeholder numbers for one email.
const MOCK_EMAIL_PERFORMANCE = {
    sent: 1247,
    openRate: 0.95,
    clickRate: 0.26,
    clickedCount: 324,
    links: [
        {id: 'l1', to: 'https://sure-footed-chapel.org/broken-spirit', count: 61},
        {id: 'l2', to: 'https://major-publicity.org/french-carboxyl', count: 60},
        {id: 'l3', to: 'https://simple-strait.info/made-up-innovation', count: 54},
        {id: 'l4', to: 'https://trivial-yarmulke.com/sudden-labourer', count: 52},
        {id: 'l5', to: 'https://ringed-doorbell.io/articles/quarterly-roundup-of-product-news-and-tips', count: 38},
        {id: 'l6', to: 'https://gentle-banyan.dev/changelog#2026-q1', count: 24}
    ]
} as const;

const EMAIL_PERFORMANCE_CHART_CONFIG = {
    value: {label: 'Rate'}
} satisfies ChartConfig;

const EmailPerformanceRing: React.FC<{
    datatype: string;
    value: number;
    color: 'purple' | 'blue' | 'teal';
    innerRadius: number;
    outerRadius: number;
    // When false the ring renders as a faded, empty track — "present but not
    // measured" — so "tracking off" never reads as a real 0%.
    tracked?: boolean;
}> = ({datatype, value, color, innerRadius, outerRadius, tracked = true}) => {
    const gradientId = `emailRing-${color}`;
    const colorVar = `var(--chart-${color})`;
    return (
        <ChartContainer className={`absolute inset-0 aspect-square ${tracked ? '' : 'opacity-30'}`} config={EMAIL_PERFORMANCE_CHART_CONFIG}>
            <Recharts.RadialBarChart
                data={[{datatype, value: tracked ? value : 0}]}
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

const EMAIL_CHART_RINGS = {
    sent: {innerRadius: 88, outerRadius: 110},
    opened: {innerRadius: 63, outerRadius: 85},
    clicked: {innerRadius: 38, outerRadius: 60}
};

const EmailPerformanceChart: React.FC<{
    openRate: number;
    clickRate: number;
    opensTracked: boolean;
    clicksTracked: boolean;
}> = ({openRate, clickRate, opensTracked, clicksTracked}) => (
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
            tracked={opensTracked}
            value={openRate}
        />
        <EmailPerformanceRing
            color='teal'
            datatype='Clicked'
            innerRadius={EMAIL_CHART_RINGS.clicked.innerRadius}
            outerRadius={EMAIL_CHART_RINGS.clicked.outerRadius}
            tracked={clicksTracked}
            value={clickRate}
        />
    </div>
);

const KPI_LINK_CLASS = 'group/kpi -mx-2 -my-1 flex flex-col gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none';

const KpiDot: React.FC<{color: string}> = ({color}) => (
    <span aria-hidden='true' className='size-2 rounded-full' style={{backgroundColor: color}} />
);

// Count-only tile (Sent) — links to a detail view. A nav arrow fades in on hover
// to signal the redirect; the link's purpose lives in sr-only (arrow is decorative).
const SentKpi: React.FC<{value: number}> = ({value}) => (
    <Link className={KPI_LINK_CLASS} to='/members'>
        <span className='flex items-center justify-between gap-1.5 text-sm text-text-secondary'>
            <span className='flex items-center gap-1.5'>
                <KpiDot color='var(--chart-purple)' />
                Sent
            </span>
            <LucideIcon.ArrowUpRight aria-hidden='true' className='size-3.5 opacity-0 transition-opacity group-hover/kpi:opacity-100' />
        </span>
        <span className='text-xl font-semibold tracking-tight tabular-nums'>{formatNumber(value)}</span>
        <span className='sr-only'>See members</span>
    </Link>
);

// Rate tile (Opened / Clicked). Tracked: rate with hover→count + a nav arrow.
// Off: muted "Off" with the same hover highlight, but hovering explains the state
// instead of navigating (no arrow).
const RateKpi: React.FC<{
    label: string;
    color: string;
    tracked: boolean;
    rate: number;
    count: number;
}> = ({label, color, tracked, rate, count}) => {
    if (!tracked) {
        // Off tile: same hover highlight as the tracked tiles, but not a link —
        // hovering explains why instead of navigating.
        return (
            <HoverCard>
                <HoverCardTrigger asChild>
                    <div className={KPI_LINK_CLASS} tabIndex={0}>
                        <span className='flex items-center gap-1.5 text-sm text-text-secondary'>
                            <KpiDot color='var(--muted-foreground)' />
                            {label}
                        </span>
                        <OffValue className='text-xl' />
                    </div>
                </HoverCardTrigger>
                <HoverCardContent>
                    Tracking is off in Analytics settings.
                </HoverCardContent>
            </HoverCard>
        );
    }
    return (
        <Link className={KPI_LINK_CLASS} to='/members'>
            <span className='flex items-center justify-between gap-1.5 text-sm text-text-secondary'>
                <span className='flex items-center gap-1.5'>
                    <KpiDot color={color} />
                    {label}
                </span>
                <LucideIcon.ArrowUpRight aria-hidden='true' className='size-3.5 opacity-0 transition-opacity group-hover/kpi:opacity-100' />
            </span>
            <span className='text-xl font-semibold tracking-tight tabular-nums'>
                <span className='group-hover/kpi:hidden'>{formatPercentage(rate)}</span>
                <span className='hidden group-hover/kpi:inline'>{formatNumber(count)}</span>
            </span>
            <span className='sr-only'>See members</span>
        </Link>
    );
};

export interface EmailPerformanceSectionProps {
    opensTracked?: boolean;
    clicksTracked?: boolean;
}

export const EmailPerformanceSection: React.FC<EmailPerformanceSectionProps> = ({
    opensTracked = true,
    clicksTracked = true
}) => {
    const {sent, openRate, clickRate, clickedCount, links} = MOCK_EMAIL_PERFORMANCE;
    const openedCount = Math.round(sent * openRate);
    const sortedLinks = [...links].sort((a, b) => b.count - a.count);

    return (
        <TooltipProvider delayDuration={500}>
            <div className='flex flex-col gap-5'>
                <Separator />
                <div className='flex flex-col gap-5'>
                    <h3 className='text-sm font-medium tracking-normal text-text-secondary'>
                        Email performance
                    </h3>
                    <div className='grid grid-cols-3 gap-4'>
                        <SentKpi value={sent} />
                        <RateKpi color='var(--chart-blue)' count={openedCount} label='Opened' rate={openRate} tracked={opensTracked} />
                        <RateKpi color='var(--chart-teal)' count={clickedCount} label='Clicked' rate={clickRate} tracked={clicksTracked} />
                    </div>
                    <EmailPerformanceChart
                        clickRate={clickRate}
                        clicksTracked={clicksTracked}
                        openRate={openRate}
                        opensTracked={opensTracked}
                    />
                </div>

                {/* Top clicked links — hidden entirely (separator + heading
                    included) when click tracking is off; the off-state is already
                    conveyed by the Clicked KPI and ring above. */}
                {clicksTracked && (
                    <>
                        <Separator />
                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center justify-between'>
                                <span className='text-sm font-medium text-text-secondary'>Top clicked links</span>
                                <span className='text-sm font-medium text-muted-foreground'>Members</span>
                            </div>
                            <DataList className='group/datalist'>
                                <DataListBody>
                                    {sortedLinks.map((link) => {
                                        const percentage = clickedCount > 0 ? link.count / clickedCount : 0;
                                        return (
                                            <DataListRow key={link.id}>
                                                <DataListBar style={{width: `${Math.round(percentage * 100)}%`}} />
                                                <DataListItemContent>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <a
                                                                className='flex min-w-0 items-center gap-2 hover:underline'
                                                                href={link.to}
                                                                rel='noreferrer'
                                                                target='_blank'
                                                            >
                                                                <LucideIcon.Link className='size-3.5 shrink-0 text-muted-foreground' strokeWidth={1.5} />
                                                                <span className='truncate font-medium'>{link.to.replace(/^https?:\/\//, '')}</span>
                                                            </a>
                                                        </TooltipTrigger>
                                                        <TooltipContent className='max-w-[28rem] break-all'>{link.to}</TooltipContent>
                                                    </Tooltip>
                                                </DataListItemContent>
                                                <DataListItemValue>
                                                    <DataListItemValueAbs>{formatNumber(link.count)}</DataListItemValueAbs>
                                                    <DataListItemValuePerc>{formatPercentage(percentage)}</DataListItemValuePerc>
                                                </DataListItemValue>
                                            </DataListRow>
                                        );
                                    })}
                                </DataListBody>
                            </DataList>
                        </div>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
};
