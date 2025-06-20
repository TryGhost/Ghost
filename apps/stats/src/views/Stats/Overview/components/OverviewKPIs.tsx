import React from 'react';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyCard, GhAreaChart, GhAreaChartDataItem, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, centsToDollars, formatNumber} from '@tryghost/shade';
import {STATS_RANGES} from '@src/utils/constants';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useAppContext} from '@src/App';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate} from '@tryghost/admin-x-framework';

interface OverviewKPICardProps {
    linkto: string;
    title: string;
    iconName?: keyof typeof LucideIcon;
    description: string;
    diffDirection?: 'up' | 'down' | 'same' | 'empty';
    diffValue?: string;
    color?: string;
    formattedValue: string;
    trendingFromValue?: string;
    children?: React.ReactNode;
    onClick?: () => void;
}

const OverviewKPICard: React.FC<OverviewKPICardProps> = ({
    // linkto,
    title,
    iconName,
    description,
    color,
    diffDirection,
    diffValue,
    formattedValue,
    trendingFromValue,
    children,
    onClick
}) => {
    // const navigate = useNavigate();
    const {range} = useGlobalData();
    const IconComponent = iconName && LucideIcon[iconName] as LucideIcon.LucideIcon;

    // Construct tooltip message based on input parameters
    const diffTooltip = React.useMemo(() => {
        if (!diffDirection || diffDirection === 'empty' || range === STATS_RANGES.allTime.value || !diffValue) {
            return '';
        }

        const directionText = diffDirection === 'up' ? 'up' : diffDirection === 'down' ? 'down' : 'at';

        // Get period text and clean it up for tooltip
        const periodText = getPeriodText(range);
        const timeRangeText = periodText
            .replace('in the ', '') // Remove "in the " prefix
            .replace(/^\(|\)$/g, ''); // Remove parentheses for "(all time)"

        if (diffDirection === 'same') {
            return (
                <span>
                    You&apos;re trending at the same level as <span className='font-semibold'>{formattedValue}</span> compared to the <span className='font-semibold'>{timeRangeText}</span>
                </span>
            );
        }

        return (
            <span>
                You&apos;re trending <span className='font-semibold'>{directionText} {diffValue}</span> from <span className='font-semibold'>{trendingFromValue}</span> compared to the {timeRangeText}
            </span>
        );
    }, [diffDirection, diffValue, trendingFromValue, formattedValue, range]);

    return (
        <Card className='group'>
            <CardHeader className='hidden'>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <KpiCardHeader className='relative flex grow flex-row items-start justify-between gap-5 border-none pb-4'>
                <div className='flex grow flex-col gap-1.5 border-none pb-0'>
                    <KpiCardHeaderLabel className={onClick && 'transition-all group-hover:text-foreground'}>
                        {color && <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: color}}></span>}
                        {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
                        {title}
                    </KpiCardHeaderLabel>
                    <KpiCardHeaderValue
                        diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : diffDirection}
                        diffTooltip={diffTooltip}
                        diffValue={diffValue}
                        value={formattedValue}
                    />
                </div>
                {onClick &&
                    <Button className='absolute right-6 translate-x-10 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100' size='sm' variant='outline' onClick={onClick}>View more</Button>
                }
            </KpiCardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
};

interface OverviewKPIsProps {
    kpiValues: {visits: string};
    visitorsChartData: GhAreaChartDataItem[];
    visitorsYRange: [number, number];
    growthTotals: {
        directions: { total: 'up' | 'down' | 'same' | 'empty'; mrr: 'up' | 'down' | 'same' | 'empty' };
        percentChanges: { total: string; mrr: string };
        totalMembers: number;
        mrr: number;
    };
    membersChartData: GhAreaChartDataItem[];
    mrrChartData: GhAreaChartDataItem[];
    currencySymbol: string;
    isLoading: boolean;
}

const OverviewKPIs:React.FC<OverviewKPIsProps> = ({
    kpiValues,
    visitorsChartData,
    visitorsYRange,
    growthTotals,
    membersChartData,
    mrrChartData,
    currencySymbol,
    isLoading
}) => {
    const navigate = useNavigate();
    const {range} = useGlobalData();
    const {appSettings} = useAppContext();

    const areaChartClassName = '-mb-3 h-[10vw] max-h-[200px] hover:!cursor-pointer';

    if (isLoading) {
        return (
            <EmptyCard className='flex h-[calc(10vw+116px)] max-h-[416px] items-center justify-center hover:!cursor-pointer'>
                <BarChartLoadingIndicator />
            </EmptyCard>
        );
    }

    let cols = 'grid-cols-3';
    if ((appSettings?.analytics.webAnalytics && !appSettings?.paidMembersEnabled) ||
        (!appSettings?.analytics.webAnalytics && appSettings?.paidMembersEnabled)) {
        cols = 'grid-cols-2';
    }

    if (!appSettings?.analytics.webAnalytics && !appSettings?.paidMembersEnabled) {
        cols = 'grid-cols-1';
    }

    const containerClass = `grid ${cols} gap-8`;

    return (
        <div className={containerClass}>
            {appSettings?.analytics.webAnalytics === true &&
                <OverviewKPICard
                    description='Number of individual people who visited your website'
                    diffDirection='empty'
                    formattedValue={kpiValues.visits}
                    iconName='Eye'
                    linkto='/web/'
                    title='Unique visitors'
                    onClick={() => {
                        navigate('/web/');
                    }}
                >
                    <GhAreaChart
                        className={areaChartClassName}
                        color='hsl(var(--chart-blue))'
                        data={visitorsChartData}
                        id="visitors"
                        range={range}
                        showHorizontalLines={true}
                        showYAxisValues={false}
                        syncId="overview-charts"
                        yAxisRange={visitorsYRange}
                    />
                </OverviewKPICard>
            }

            <OverviewKPICard
                description='How number of members of your publication changed over time'
                diffDirection={growthTotals.directions.total}
                diffValue={growthTotals.percentChanges.total}
                formattedValue={formatNumber(growthTotals.totalMembers)}
                iconName='User'
                linkto='/growth/'
                title='Members'
                trendingFromValue={`${formatNumber(membersChartData[0].value)}`}
                onClick={() => {
                    navigate('/growth/?tab=total-members');
                }}
            >
                <GhAreaChart
                    className={areaChartClassName}
                    color='hsl(var(--chart-darkblue))'
                    data={membersChartData}
                    id="members"
                    range={range}
                    showHorizontalLines={true}
                    showYAxisValues={false}
                    syncId="overview-charts"
                />
            </OverviewKPICard>

            {appSettings?.paidMembersEnabled === true &&
                <OverviewKPICard
                    description='Monthly recurring revenue changes over time'
                    diffDirection={growthTotals.directions.mrr}
                    diffValue={growthTotals.percentChanges.mrr}
                    formattedValue={`${currencySymbol}${formatNumber(centsToDollars(growthTotals.mrr))}`}
                    iconName='Coins'
                    linkto='/growth/'
                    title='MRR'
                    trendingFromValue={`${currencySymbol}${formatNumber(mrrChartData[0].value)}`}
                    onClick={() => {
                        navigate('/growth/?tab=mrr');
                    }}
                >
                    <GhAreaChart
                        className={areaChartClassName}
                        color='hsl(var(--chart-teal))'
                        data={mrrChartData}
                        id="mrr"
                        range={range}
                        showHorizontalLines={true}
                        showYAxisValues={false}
                        syncId="overview-charts"
                    />
                </OverviewKPICard>
            }
        </div>
    );
};

export default OverviewKPIs;
