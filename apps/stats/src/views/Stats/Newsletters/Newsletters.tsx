// import AudienceSelect from './components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import NewsletterKPIs from './components/NewslettersKPIs';
import NewsletterSelect from '../components/NewsletterSelect';
import React, {useMemo, useState} from 'react';
import SortButton from '../components/SortButton';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, SkeletonTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
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

// Separate component for the top newsletters table to handle sorting locally
const TopNewslettersTable: React.FC<{
    range: number;
    selectedNewsletterId: string | null | undefined;
    shouldFetchStats: boolean;
}> = ({range, selectedNewsletterId, shouldFetchStats}) => {
    const [sortBy, setSortBy] = useState<TopNewslettersOrder>('date desc');
    const navigate = useNavigate();

    // Fetch newsletter stats with reactive sort order - isolated to this component
    const {data: newsletterStatsData, isLoading: isStatsLoading, isClicksLoading} = useNewsletterStatsWithRangeSplit(
        range,
        sortBy, // Reactive to sort changes, but only affects this component
        selectedNewsletterId ? selectedNewsletterId : undefined,
        Boolean(shouldFetchStats)
    );

    const isLoading = isStatsLoading || !newsletterStatsData;

    if (isLoading) {
        return (
            <Card className='min-h-[460px]'>
                <CardHeader>
                    <CardTitle>Top newsletters</CardTitle>
                    <CardDescription> Your best performing newsletters {getPeriodText(range)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <SkeletonTable lines={5} />
                </CardContent>
            </Card>
        );
    }

    // Data is already sorted by the API based on sortBy
    const sortedStats = newsletterStatsData?.stats || [];

    return (
        <Card>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead variant='cardhead'>
                                <CardHeader>
                                    <CardTitle>Top newsletters</CardTitle>
                                    <CardDescription> Your best performing newsletters {getPeriodText(range)}</CardDescription>
                                </CardHeader>
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
                    <TableBody>
                        {sortedStats.map(post => (
                            <TableRow key={post.post_id} className='last:border-none [&>td]:py-2.5'>
                                <TableCell className="font-medium">
                                    <div className='group/link inline-flex items-center gap-2'>
                                        {post.post_id ?
                                            <Button className='h-auto whitespace-normal p-0 text-left hover:!underline' title="View post analytics" variant='link' onClick={() => {
                                                navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
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
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

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

    // Find the selected newsletter to get its active_members count
    const selectedNewsletter = useMemo(() => {
        if (!newslettersData?.newsletters || !selectedNewsletterId) {
            return null;
        }
        return newslettersData.newsletters.find(n => n.id === selectedNewsletterId) || null;
    }, [newslettersData, selectedNewsletterId]);

    // Calculate totals for KPIs - we'll need a separate API call for newsletter stats just for averages
    const totals = useMemo(() => {
        // Get total subscribers from the selected newsletter or all newsletters
        const totalSubscribers = selectedNewsletter?.count?.active_members ||
            subscriberStatsData?.stats?.[0]?.total ||
            0;

        // For now, return basic totals - averages will be calculated in a separate component if needed
        return {
            totalSubscribers,
            avgOpenRate: 0,
            avgClickRate: 0
        };
    }, [selectedNewsletter, subscriberStatsData]);

    // Create subscribers data from newsletter subscriber stats
    const subscribersData = useMemo(() => {
        if (!subscriberStatsData?.stats?.[0]?.deltas || subscriberStatsData.stats[0].deltas.length === 0) {
            return [];
        }

        // Convert to the required format - already in the correct format
        return subscriberStatsData.stats[0].deltas;
    }, [subscriberStatsData]);

    // For the KPIs component, we'll use empty avgsData since averages are calculated separately now
    const avgsData: AvgsDataItem[] = [];

    // Separate loading states for different sections
    const isKPIsLoading = isNewslettersLoading || isSubscriberStatsLoading;

    const pageData = isKPIsLoading ? undefined : (selectedNewsletterId && subscribersData.length > 1 ? ['data exists'] : []);

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
