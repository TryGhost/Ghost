// import AudienceSelect from './components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import NewsletterKPIs from './components/NewslettersKPIs';
import NewsletterSelect from '../components/NewsletterSelect';
import React, {useMemo, useState} from 'react';
import SortButton from '../components/SortButton';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
import {Navigate, useAppContext, useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNewsletterStatsWithRangeSplit, useSubscriberCountWithRange} from '@src/hooks/useNewsletterStatsWithRange';
import type {TopNewslettersOrder} from '@src/hooks/useNewsletterStatsWithRange';

export type AvgsDataItem = {
    post_id: string;
    post_title: string;
    send_date: Date | string;
    sent_to: number;
    total_opens: number;
    open_rate: number;
    total_clicks: number;
    click_rate: number;
};

// Separate component for just the table rows that handles data fetching
const NewsletterTableRows: React.FC<{
    range: number;
    selectedNewsletterId: string | null | undefined;
    shouldFetchStats: boolean;
    sortBy: TopNewslettersOrder;
}> = React.memo(({range, selectedNewsletterId, shouldFetchStats, sortBy}) => {
    const navigate = useNavigate();

    // Fetch newsletter stats with reactive sort order - isolated to this component
    const {data: newsletterStatsData, isLoading: isStatsLoading, isClicksLoading} = useNewsletterStatsWithRangeSplit(
        range,
        sortBy, // Reactive to sort changes, but only affects this component
        selectedNewsletterId ? selectedNewsletterId : undefined,
        Boolean(shouldFetchStats)
    );

    // Data is already sorted by the API based on sortBy
    const sortedStats = useMemo(() => newsletterStatsData?.stats || [], [newsletterStatsData]);

    // Memoize loading rows to prevent recreation on every render
    const loadingRows = useMemo(() => (
        <>
            {Array.from({length: 5}, (_, index) => (
                <TableRow key={`newsletter-loading-row-${index}`} className='last:border-none [&>td]:py-2.5'>
                    <TableCell className="font-medium">
                        <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-200"></div>
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-200"></div>
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-200"></div>
                    </TableCell>
                </TableRow>
            ))}
        </>
    ), []);

    // Memoize the data rows based on the actual data and loading states
    const dataRows = useMemo(() => (
        <>
            {sortedStats.map(post => (
                <TableRow key={post.post_id} className='last:border-none [&>td]:py-2.5'>
                    <TableCell className="font-medium">
                        <div className='group/link inline-flex items-center gap-2'>
                            {post.post_id ?
                                <Button className='h-auto whitespace-normal p-0 text-left hover:!underline' title="View post analytics" variant='link' onClick={() => {
                                    navigate(`/posts/analytics/beta/${post.post_id}/`, {crossApp: true});
                                }}>
                                    {post.post_title}
                                </Button>
                                :
                                <>
                                    {post.post_title}
                                </>
                            }
                        </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                        {formatDisplayDate(new Date(post.send_date))}
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                        {formatNumber(post.sent_to)}
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                        <span className="group-hover:hidden">{formatPercentage(post.open_rate)}</span>
                        <span className="hidden group-hover:!visible group-hover:!block">{formatNumber(post.total_opens)}</span>
                    </TableCell>
                    <TableCell className='text-right font-mono text-sm'>
                        {isClicksLoading ? (
                            <span className="inline-block h-4 w-8 animate-pulse rounded bg-gray-200"></span>
                        ) : (
                            <>
                                <span className="group-hover:hidden">{formatPercentage(post.click_rate)}</span>
                                <span className="hidden group-hover:!visible group-hover:!block">{formatNumber(post.total_clicks)}</span>
                            </>
                        )}
                    </TableCell>
                </TableRow>
            ))}
        </>
    ), [sortedStats, isClicksLoading, navigate]);

    // Show loading rows while data is loading
    if (isStatsLoading || !newsletterStatsData) {
        return loadingRows;
    }

    return dataRows;
});

NewsletterTableRows.displayName = 'NewsletterTableRows';

// Memoized table header component to prevent re-renders
const NewsletterTableHeader: React.FC<{
    sortBy: TopNewslettersOrder;
    setSortBy: (sort: TopNewslettersOrder) => void;
    range: number;
}> = React.memo(({sortBy, setSortBy, range}) => {
    // Memoize the card header content since it only depends on range
    const cardHeaderContent = useMemo(() => (
        <CardHeader>
            <CardTitle>Top newsletters</CardTitle>
            <CardDescription> Your best performing newsletters {getPeriodText(range)}</CardDescription>
        </CardHeader>
    ), [range]);

    return (
        <TableHeader>
            <TableRow>
                <TableHead className='min-w-[320px]' variant='cardhead'>
                    {cardHeaderContent}
                </TableHead>
                <TableHead className='w-[65px]'>
                    <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='date desc'>
                    Date
                    </SortButton>
                </TableHead>
                <TableHead className='w-[90px] text-right'>
                    <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='sent_to desc'>
                    Sent
                    </SortButton>
                </TableHead>
                <TableHead className='w-[90px] text-right'>
                    <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='open_rate desc'>
                    Opens
                    </SortButton>
                </TableHead>
                <TableHead className='w-[90px] text-right'>
                    <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='click_rate desc'>
                    Clicks
                    </SortButton>
                </TableHead>
            </TableRow>
        </TableHeader>
    );
});

NewsletterTableHeader.displayName = 'NewsletterTableHeader';

// Optimized table component that only re-renders rows when data changes
const TopNewslettersTable: React.FC<{
    range: number;
    selectedNewsletterId: string | null | undefined;
    shouldFetchStats: boolean;
}> = React.memo(({range, selectedNewsletterId, shouldFetchStats}) => {
    const [sortBy, setSortBy] = useState<TopNewslettersOrder>('date desc');

    return (
        <Card className='w-full max-w-[calc(100vw-64px)] overflow-x-auto sidebar:max-w-[calc(100vw-64px-280px)]'>
            <CardContent>
                <Table>
                    <NewsletterTableHeader range={range} setSortBy={setSortBy} sortBy={sortBy} />
                    <TableBody>
                        <NewsletterTableRows
                            range={range}
                            selectedNewsletterId={selectedNewsletterId}
                            shouldFetchStats={shouldFetchStats}
                            sortBy={sortBy}
                        />
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
});

TopNewslettersTable.displayName = 'TopNewslettersTable';

const Newsletters: React.FC = () => {
    const {range, selectedNewsletterId} = useGlobalData();
    const [searchParams] = useSearchParams();
    const {appSettings} = useAppContext();

    // Get the initial tab from URL search parameters
    const initialTab = searchParams.get('tab') || 'total-subscribers';

    // Get newsletters list for dropdown (without expensive counts)
    const {data: newslettersData, isLoading: isNewslettersLoading} = useBrowseNewsletters({
        searchParams: {
            limit: '50'
        }
    });

    // Only enable stats queries once newsletters are loaded AND we have a newsletter selected
    // This prevents both:
    // 1. Empty API calls before newsletters load
    // 2. Unnecessary calls when no newsletter is selected yet
    const shouldFetchStats = !isNewslettersLoading && newslettersData && newslettersData.newsletters.length > 0 && !!selectedNewsletterId;

    // Get subscriber count over time for the selected newsletter
    const {data: subscriberStatsData, isLoading: isSubscriberStatsLoading} = useSubscriberCountWithRange(
        range,
        selectedNewsletterId || undefined,
        shouldFetchStats || false
    );

    // Get newsletter stats with click data to check if any newsletters were sent in the time period
    // and to calculate averages - using the same data source as the table for consistency
    const {data: newsletterStatsData, isLoading: isNewsletterStatsLoading, isClicksLoading} = useNewsletterStatsWithRangeSplit(
        range,
        'date desc',
        selectedNewsletterId || undefined,
        shouldFetchStats || false
    );

    // Find the selected newsletter to get its active_members count
    const selectedNewsletter = useMemo(() => {
        if (!newslettersData?.newsletters || !selectedNewsletterId) {
            return null;
        }
        return newslettersData.newsletters.find(n => n.id === selectedNewsletterId) || null;
    }, [newslettersData, selectedNewsletterId]);

    // Calculate totals for KPIs - now including proper averages from newsletter stats
    const totals = useMemo(() => {
        // Get total subscribers from the selected newsletter or all newsletters
        const totalSubscribers = selectedNewsletter?.count?.active_members ||
            subscriberStatsData?.stats?.[0]?.total ||
            0;

        // Calculate averages from newsletter stats data
        let avgOpenRate = 0;
        let avgClickRate = 0;

        if (newsletterStatsData?.stats && newsletterStatsData.stats.length > 0) {
            const stats = newsletterStatsData.stats;
            const totalOpenRate = stats.reduce((sum, stat) => sum + (stat.open_rate || 0), 0);
            const totalClickRate = stats.reduce((sum, stat) => sum + (stat.click_rate || 0), 0);

            avgOpenRate = totalOpenRate / stats.length;
            avgClickRate = totalClickRate / stats.length;
        }

        return {
            totalSubscribers,
            avgOpenRate,
            avgClickRate
        };
    }, [selectedNewsletter, subscriberStatsData, newsletterStatsData]);

    // Create subscribers data from newsletter subscriber stats
    const subscribersData = useMemo(() => {
        if (!subscriberStatsData?.stats?.[0]?.deltas || subscriberStatsData.stats[0].deltas.length === 0) {
            return [];
        }

        // Convert to the required format - already in the correct format
        return subscriberStatsData.stats[0].deltas;
    }, [subscriberStatsData]);

    // Create avgsData from newsletter stats for the bar charts
    const avgsData: AvgsDataItem[] = useMemo(() => {
        if (!newsletterStatsData?.stats) {
            return [];
        }

        return newsletterStatsData.stats.map(stat => ({
            post_id: stat.post_id,
            post_title: stat.post_title,
            send_date: stat.send_date,
            sent_to: stat.sent_to,
            total_opens: stat.total_opens,
            open_rate: stat.open_rate,
            total_clicks: stat.total_clicks || 0,
            click_rate: stat.click_rate || 0
        }));
    }, [newsletterStatsData]);

    // Separate loading states for different sections
    const isKPIsLoading = isNewslettersLoading || isSubscriberStatsLoading || isClicksLoading;

    // Show data only if there are actual newsletters sent in the time period
    const hasNewslettersInPeriod = newsletterStatsData?.stats && newsletterStatsData.stats.length > 0;
    const pageData = isKPIsLoading || isNewsletterStatsLoading ? undefined : (hasNewslettersInPeriod ? ['data exists'] : []);

    if (!appSettings?.newslettersEnabled) {
        return (
            <Navigate to='/' />
        );
    }

    return (
        <StatsLayout>
            <StatsHeader>
                <NewsletterSelect newsletters={newslettersData?.newsletters} />
                <DateRangeSelect />
            </StatsHeader>
            <StatsView data={pageData} isLoading={false} loadingComponent={<></>}>
                <Card>
                    <CardContent>
                        <NewsletterKPIs
                            avgsData={avgsData}
                            initialTab={initialTab}
                            isAvgsLoading={false}
                            isLoading={isKPIsLoading}
                            subscribersData={subscribersData}
                            totals={totals}
                        />
                    </CardContent>
                </Card>
                <TopNewslettersTable
                    range={range}
                    selectedNewsletterId={selectedNewsletterId}
                    shouldFetchStats={!!shouldFetchStats}
                />
            </StatsView>
        </StatsLayout>
    );
};

// Export the component directly now that we handle the feature flag in routes.tsx
export default Newsletters;
