import React from 'react';
import {BarChartLoadingIndicator, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyCard, GhAreaChart, GhAreaChartDataItem, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, centsToDollars, formatNumber} from '@tryghost/shade';
import {STATS_RANGES} from '@src/utils/constants';
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
    children,
    onClick
}) => {
    // const navigate = useNavigate();
    const {range} = useGlobalData();
    const IconComponent = iconName && LucideIcon[iconName] as LucideIcon.LucideIcon;

    return (
        <Card className={onClick && 'group transition-all hover:!cursor-pointer hover:bg-accent/50'} onClick={onClick}>
            <CardHeader className='hidden'>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <KpiCardHeader className='grow gap-2 border-none pb-0'>
                <KpiCardHeaderLabel className={onClick && 'transition-all group-hover:text-foreground'}>
                    {color && <span className='inline-block size-2 rounded-full opacity-50' style={{backgroundColor: color}}></span>}
                    {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
                    {title}
                </KpiCardHeaderLabel>
                <KpiCardHeaderValue
                    diffDirection={range === STATS_RANGES.allTime.value ? 'hidden' : diffDirection}
                    diffValue={diffValue}
                    value={formattedValue}
                />
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

    const areaChartClassName = '-mb-3 h-[10vw] max-h-[200px] hover:!cursor-pointer';

    if (isLoading) {
        return (
            <EmptyCard className='flex h-[calc(10vw+116px)] max-h-[416px] items-center justify-center hover:!cursor-pointer'>
                <BarChartLoadingIndicator />
            </EmptyCard>
        );
    }

    return (
        <div className='grid grid-cols-3 gap-8'>
            <OverviewKPICard
                color='hsl(var(--chart-blue))'
                description='Number of individual people who visited your website'
                diffDirection='empty'
                formattedValue={kpiValues.visits}
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

            <OverviewKPICard
                color='hsl(var(--chart-teal))'
                description='How number of members of your publication changed over time'
                diffDirection={growthTotals.directions.total}
                diffValue={growthTotals.percentChanges.total}
                formattedValue={formatNumber(growthTotals.totalMembers)}
                linkto='/growth/'
                title='Members'
                onClick={() => {
                    navigate('/growth/?tab=total-members');
                }}
            >
                <GhAreaChart
                    className={areaChartClassName}
                    color='hsl(var(--chart-teal))'
                    data={membersChartData}
                    id="members"
                    range={range}
                    showHorizontalLines={true}
                    showYAxisValues={false}
                    syncId="overview-charts"
                />
            </OverviewKPICard>

            <OverviewKPICard
                color='hsl(var(--chart-purple))'
                description='Monthly recurring revenue changes over time'
                diffDirection={growthTotals.directions.mrr}
                diffValue={growthTotals.percentChanges.mrr}
                formattedValue={`${currencySymbol}${formatNumber(centsToDollars(growthTotals.mrr))}`}
                linkto='/growth/'
                title='MRR'
                onClick={() => {
                    navigate('/growth/?tab=mrr');
                }}
            >
                <GhAreaChart
                    className={areaChartClassName}
                    color='hsl(var(--chart-purple))'
                    data={mrrChartData}
                    id="mrr"
                    range={range}
                    showHorizontalLines={true}
                    showYAxisValues={false}
                    syncId="overview-charts"
                />
            </OverviewKPICard>
        </div>
    );
};

export default OverviewKPIs;
