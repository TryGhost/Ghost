import DateRangeSelect from '../components/DateRangeSelect';
import LatestPost from './components/LatestPost';
import OverviewKPIs from './components/OverviewKPIs';
import React, {useMemo} from 'react';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import TopPosts from './components/TopPosts';
import {GhAreaChartDataItem, H3, LucideIcon, centsToDollars, cn, formatNumber, formatQueryDate, getRangeDates, sanitizeChartData} from '@tryghost/shade';
import {getAudienceQueryParam} from '../components/AudienceSelect';
import {useAppContext} from '@src/App';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';
import {useLatestPostStats} from '@src/hooks/useLatestPostStats';
import {useTinybirdQuery} from '@tryghost/admin-x-framework';
import {useTopPostsViews} from '@tryghost/admin-x-framework/api/stats';

interface HelpCardProps {
    className?: string;
    title: string;
    description: string;
    url: string;
    children?: React.ReactNode;
}

export const HelpCard: React.FC<HelpCardProps> = ({
    className,
    title,
    description,
    url,
    children
}) => {
    return (
        <a className={cn(
            'block rounded-xl border bg-card p-6 transition-all hover:shadow-xs hover:bg-accent/50 group/card',
            className
        )} href={url} rel='noreferrer' target='_blank'>
            <div className='flex items-center gap-6'>
                {children}
                <div className='flex flex-col gap-0.5 leading-tight'>
                    <span className='text-base font-semibold'>{title}</span>
                    <span className='text-sm font-normal text-gray-700'>{description}</span>
                </div>
            </div>
        </a>
    );
};

interface WebKpiDataItem {
    date: string;
    [key: string]: string | number;
}

type GrowthChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    formattedValue: string;
    label?: string;
};

const Overview: React.FC = () => {
    const {appSettings} = useAppContext();
    const {statsConfig, isLoading: isConfigLoading, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {isLoading: isGrowthStatsLoading, chartData: growthChartData, totals: growthTotals, currencySymbol} = useGrowthStats(range);
    const {data: latestPostStats, isLoading: isLatestPostLoading} = useLatestPostStats();
    const {data: topPostsData, isLoading: isTopPostsLoading} = useTopPostsViews({
        searchParams: {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            limit: '5',
            timezone
        }
    });

    /* Get visitors
    /* ---------------------------------------------------------------------- */
    const visitorsParams = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data: visitorsData, loading: isVisitorsLoading} = useTinybirdQuery({
        endpoint: 'api_kpis',
        statsConfig,
        params: visitorsParams
    });

    const visitorsChartData = useMemo(() => {
        return sanitizeChartData<WebKpiDataItem>(visitorsData as WebKpiDataItem[] || [], range, 'visits' as keyof WebKpiDataItem, 'sum')?.map((item: WebKpiDataItem) => {
            const value = Number(item.visits);
            const safeValue = isNaN(value) ? 0 : value;
            return {
                date: String(item.date),
                value: safeValue,
                formattedValue: formatNumber(safeValue),
                label: 'Visitors'
            };
        });
    }, [visitorsData, range]);
    const visitorsYRange: [number, number] = useMemo(() => {
        const defaultRange: [number, number] = [0, 1];
        if (!visitorsChartData || visitorsChartData.length === 0) {
            return defaultRange; // Default range when no data
        }

        // Extract values and filter out negative values
        const values = visitorsChartData
            .map((item: GhAreaChartDataItem) => item.value)
            .filter((value: number) => value >= 0); // Only keep non-negative values

        if (values.length === 0) {
            return defaultRange; // Default range if no valid values
        }

        const maxValue = Math.max(...values);
        return [0, maxValue || defaultRange[1]]; // Use 10 as minimum if maxValue is 0
    }, [visitorsChartData]);

    /* Get members
    /* ---------------------------------------------------------------------- */
    // Create chart data based on selected tab
    const membersChartData = useMemo(() => {
        if (!growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'value';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: GhAreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: item.free + item.paid,
            formattedValue: formatNumber(item.free + item.paid),
            label: 'Members'
        }));

        return processedData;
    }, [growthChartData, range]);

    /* Get MRR
    /* ---------------------------------------------------------------------- */
    // Create chart data based on selected tab
    const mrrChartData = useMemo(() => {
        if (!appSettings?.paidMembersEnabled || !growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'mrr';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: GhAreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: centsToDollars(item.mrr),
            formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
            label: 'MRR'
        }));

        return processedData;
    }, [growthChartData, range, currencySymbol, appSettings]);

    /* Calculate KPI values
    /* ---------------------------------------------------------------------- */
    const kpiValues = useMemo(() => {
        // Visitors data
        if (!visitorsData?.length) {
            return {visits: '0'};
        }

        const totalVisits = visitorsData.reduce((sum, item) => {
            const visits = Number(item.visits);
            return sum + (isNaN(visits) ? 0 : visits);
        }, 0);

        return {
            visits: formatNumber(totalVisits)
        };
    }, [visitorsData]);

    const isPageLoading = isConfigLoading;

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect excludeRanges={['today']} />
            </StatsHeader>
            <StatsView isLoading={isPageLoading} loadingComponent={<></>}>
                <OverviewKPIs
                    currencySymbol={currencySymbol}
                    growthTotals={growthTotals}
                    isLoading={isVisitorsLoading || isGrowthStatsLoading}
                    kpiValues={kpiValues}
                    membersChartData={membersChartData}
                    mrrChartData={mrrChartData}
                    visitorsChartData={visitorsChartData}
                    visitorsYRange={visitorsYRange}
                />
                <LatestPost
                    isLoading={isLatestPostLoading}
                    latestPostStats={latestPostStats}
                />
                <TopPosts
                    isLoading={isTopPostsLoading}
                    topPostsData={topPostsData}
                />
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
                    <H3 className='-mb-4 mt-4 lg:col-span-2'>Grow your audience</H3>
                    <HelpCard
                        description='Find out how to review the performance of your content and get the most out of post analytics in Ghost.'
                        title='Understanding analytics in Ghost'
                        url='https://ghost.org/help/native-analytics'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-tr from-[#14B8FF]/20 to-[#00BBA7]/20 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.ChartColumnIncreasing className='text-[#00BBA7]' size={20} strokeWidth={1.5} />
                        </div>
                    </HelpCard>
                    <HelpCard
                        description='Use these content distribution tactics to get more people to discover your work and increase engagement.'
                        title='How to get your content seen online'
                        url='https://ghost.org/resources/content-distribution/'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-tl from-[#FDC700]/20 to-[#FF2056]/20 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.Globe className='text-[#FE9A00]' size={20} strokeWidth={1.5} />
                        </div>
                    </HelpCard>
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Overview;
