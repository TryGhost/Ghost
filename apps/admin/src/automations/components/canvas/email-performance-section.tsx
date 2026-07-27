import React from 'react';
import {useEmailTrackingSettings} from '@/automations/hooks/use-email-tracking-settings';
import {ChartContainer, DataList, DataListBar, DataListBody, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, HoverCard, HoverCardContent, HoverCardTrigger, LoadingIndicator, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import type {ChartConfig} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import type {AutomationActionLink, AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {useBrowseAutomationActionLinks} from '@tryghost/admin-x-framework/api/automations';
import {LucideIcon, Recharts, cn, formatNumber, formatPercentage} from '@tryghost/shade/utils';
import {formatRate} from './format-stats';
import {OffValue, TRACKING_OFF_MESSAGE} from './off-value';

const EMAIL_PERFORMANCE_CHART_CONFIG = {
    value: {label: 'Rate'}
} satisfies ChartConfig;

const EmailPerformanceRing: React.FC<{
    datatype: string;
    value: number;
    color: 'purple' | 'blue' | 'teal';
    innerRadius: number;
    outerRadius: number;
    tracked?: boolean;
}> = ({datatype, value, color, innerRadius, outerRadius, tracked = true}) => {
    const gradientId = `emailRing-${color}`;
    const colorVar = `var(--chart-${color})`;
    return (
        <ChartContainer
            aria-label={`${datatype} rate chart ring`}
            className={cn('absolute inset-0 aspect-square', !tracked && 'opacity-30')}
            config={EMAIL_PERFORMANCE_CHART_CONFIG}
            data-testid={`email-performance-${datatype.toLowerCase()}-ring`}
            data-tracked={tracked}
            role='img'
        >
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

// Per-ring radii in px, calibrated for a 240×240 chart container. Each ring is 22px thick with a
// 3px gap. Recharts' <RadialBar> doesn't accept innerRadius/outerRadius (those live on the parent
// <RadialBarChart>), so we draw each ring with its own absolutely-positioned chart.
const EMAIL_CHART_RINGS = {
    sent: {innerRadius: 88, outerRadius: 110},
    opened: {innerRadius: 63, outerRadius: 85},
    clicked: {innerRadius: 38, outerRadius: 60}
};

const EmailPerformanceChart: React.FC<{
    clickRate: number;
    openRate: number;
    clicksTracked: boolean;
    opensTracked: boolean;
}> = ({clickRate, openRate, clicksTracked, opensTracked}) => (
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

const KPI_CLASS_NAME = 'group/kpi -mx-2 -my-1 flex flex-col gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none';

const Kpi: React.FC<{
    label: string;
    color: string;
    tracked?: boolean;
    value: string;
    hoverValue?: string;
}> = ({label, color, tracked = true, value, hoverValue}) => {
    const tile = (
        <div className={KPI_CLASS_NAME} tabIndex={tracked ? undefined : 0}>
            <span className='flex items-center gap-1.5 text-sm text-text-secondary'>
                <span aria-hidden='true' className='size-2 rounded-full' style={{backgroundColor: tracked ? color : 'var(--muted-foreground)'}} />
                {label}
            </span>
            {tracked
                ? (
                    <span className='text-xl font-semibold tracking-tight tabular-nums'>
                        <span className='group-hover/kpi:hidden'>{value}</span>
                        <span className='hidden group-hover/kpi:inline'>{hoverValue ?? value}</span>
                    </span>
                )
                : <OffValue className='text-xl' />}
        </div>
    );
    if (tracked) {
        return tile;
    }
    return (
        <HoverCard>
            <HoverCardTrigger asChild>{tile}</HoverCardTrigger>
            <HoverCardContent>{TRACKING_OFF_MESSAGE}</HoverCardContent>
        </HoverCard>
    );
};

const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '');

const TopClickedLinksContent: React.FC<{
    clickedCount: number;
    isError: boolean;
    isLoading: boolean;
    links: AutomationActionLink[];
    sentCount: number;
}> = ({clickedCount, isError, isLoading, links, sentCount}) => {
    if (sentCount === 0) {
        return <Text className='py-6 text-center' size='sm' tone='secondary'>No emails sent yet.</Text>;
    }

    if (isLoading) {
        return <Inline className='py-6' data-testid='automation-action-links-loading' justify='center'><LoadingIndicator size='sm' /></Inline>;
    }

    if (isError) {
        return <Text className='py-6 text-center text-destructive' role='alert' size='sm'>Couldn&apos;t load clicked links.</Text>;
    }

    if (links.length === 0) {
        return <Text className='py-6 text-center' size='sm' tone='secondary'>No click data yet.</Text>;
    }

    return (
        <TooltipProvider delayDuration={150}>
            <DataList className='group/datalist'>
                <DataListBody>
                    {links.map((link) => {
                        const percentage = clickedCount > 0 ? Math.min(link.clicked_count / clickedCount, 1) : 0;
                        return (
                            <DataListRow key={link.url}>
                                <DataListBar style={{width: `${Math.round(percentage * 100)}%`}} />
                                <DataListItemContent>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <a className='block min-w-0 hover:underline' href={link.url} rel='noreferrer' target='_blank'>
                                                <Inline as='span' className='min-w-0' gap='sm'>
                                                    <LucideIcon.Link className='shrink-0 text-muted-foreground' size={16} strokeWidth={1.5} />
                                                    <Text as='span' className='font-medium' truncate>{displayUrl(link.url)}</Text>
                                                </Inline>
                                            </a>
                                        </TooltipTrigger>
                                        <TooltipContent className='max-w-[28rem] break-all'>{link.url}</TooltipContent>
                                    </Tooltip>
                                </DataListItemContent>
                                <DataListItemValue>
                                    <DataListItemValueAbs>{formatNumber(link.clicked_count)}</DataListItemValueAbs>
                                    <DataListItemValuePerc>{formatPercentage(percentage)}</DataListItemValuePerc>
                                </DataListItemValue>
                            </DataListRow>
                        );
                    })}
                </DataListBody>
            </DataList>
        </TooltipProvider>
    );
};

const TopClickedLinks: React.FC<{
    actionId: string;
    automationId: string;
    clickedCount: number;
    sentCount: number;
}> = ({actionId, automationId, clickedCount, sentCount}) => {
    const {data, isError, isLoading} = useBrowseAutomationActionLinks(automationId, actionId, {
        defaultErrorHandler: false,
        enabled: sentCount > 0
    });
    const links = data?.automation_action_links.slice(0, 10) ?? [];

    return (
        <>
            <Separator />
            <Stack gap='md'>
                <Inline justify='between'>
                    <Text size='sm' tone='secondary' weight='medium'>Top clicked links</Text>
                    <Text size='sm' tone='tertiary' weight='medium'>Members</Text>
                </Inline>
                <TopClickedLinksContent
                    clickedCount={clickedCount}
                    isError={isError}
                    isLoading={isLoading}
                    links={links}
                    sentCount={sentCount}
                />
            </Stack>
        </>
    );
};

export const EmailPerformanceSection: React.FC<{actionId: string; automationId: string; stats: AutomationEmailStats}> = ({actionId, automationId, stats}) => {
    const {emailTrackOpens, emailTrackClicks} = useEmailTrackingSettings();

    return (
        <div className='flex flex-col gap-5'>
            <Separator />
            <div className='flex flex-col gap-5'>
                <h3 className='text-sm font-medium tracking-normal text-text-secondary'>
                    Email performance
                </h3>
                <div className='grid grid-cols-3 gap-4'>
                    <Kpi
                        color='var(--chart-purple)'
                        label='Sent'
                        value={formatNumber(stats.email_sent_count)}
                    />
                    <Kpi
                        color='var(--chart-blue)'
                        hoverValue={stats.email_sent_count > 0 ? formatNumber(stats.email_opened_count) : '--'}
                        label='Opened'
                        tracked={emailTrackOpens}
                        value={formatRate(stats.opened_rate)}
                    />
                    <Kpi
                        color='var(--chart-teal)'
                        hoverValue={stats.email_sent_count > 0 ? formatNumber(stats.email_clicked_count) : '--'}
                        label='Clicked'
                        tracked={emailTrackClicks}
                        value={formatRate(stats.clicked_rate)}
                    />
                </div>
                <EmailPerformanceChart
                    clickRate={(stats.clicked_rate ?? 0) / 100}
                    clicksTracked={emailTrackClicks}
                    openRate={(stats.opened_rate ?? 0) / 100}
                    opensTracked={emailTrackOpens}
                />
            </div>
            {emailTrackClicks && (
                <TopClickedLinks
                    actionId={actionId}
                    automationId={automationId}
                    clickedCount={stats.email_clicked_count}
                    sentCount={stats.email_sent_count}
                />
            )}
        </div>
    );
};
