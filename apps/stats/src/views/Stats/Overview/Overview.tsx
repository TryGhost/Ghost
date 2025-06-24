import DateRangeSelect from '../components/DateRangeSelect';
import LatestPost from './components/LatestPost';
import OverviewKPIs from './components/OverviewKPIs';
import React from 'react';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import TopPosts from './components/TopPosts';
import {cn, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {useAppContext} from '@src/App';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';
import {useKpiData} from '@src/hooks/api';
import {useLatestPostStats} from '@src/hooks/useLatestPostStats';
import {useOverviewChartData} from './hooks/useOverviewChartData';
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
            'block rounded-xl border bg-card p-6 transition-all hover:shadow-xs hover:bg-accent group/card',
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

const Overview: React.FC = () => {
    const {appSettings} = useAppContext();
    const {isLoading: isConfigLoading, range} = useGlobalData();
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

    /* Get visitors using unified API hook
    /* ---------------------------------------------------------------------- */
    const {data: visitorsData, loading: isVisitorsLoading} = useKpiData();

    const {
        visitorsChartData,
        visitorsYRange,
        membersChartData,
        mrrChartData,
        kpiValues
    } = useOverviewChartData(visitorsData, growthChartData, range, currencySymbol, appSettings?.paidMembersEnabled);

    const isPageLoading = isConfigLoading;

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect />
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
                {/* <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
                    <H3 className='-mb-4 mt-4 lg:col-span-2'>Grow your audience</H3>
                    <HelpCard
                        description='Find out how to review the performance of your content and get the most out of post analytics in Ghost.'
                        title='Understanding analytics in Ghost'
                        url='https://ghost.org/help/post-analytics/'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.ChartColumnIncreasing className='text-muted-foreground' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                    <HelpCard
                        description='Use these content distribution tactics to get more people to discover your work and increase engagement.'
                        title='How to get your content seen online'
                        url='https://ghost.org/resources/content-distribution/'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.Sprout className='text-muted-foreground' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                </div> */}
            </StatsView>
        </StatsLayout>
    );
};

export default Overview;
