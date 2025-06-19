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
import {getPeriodText} from '@src/utils/chart-helpers';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
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

const Newsletters: React.FC = () => {
    const {range, selectedNewsletterId} = useGlobalData();
    const [sortBy, setSortBy] = useState<TopNewslettersOrder>('date desc');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

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

    // Get newsletter stats using the split hook for better performance
    const {data: newsletterStatsData, isLoading: isStatsLoading, isClicksLoading} = useNewsletterStatsWithRangeSplit(
        range,
        sortBy,
        selectedNewsletterId || undefined,
        shouldFetchStats
    );

    // Get subscriber count over time for the selected newsletter
    const {data: subscriberStatsData, isLoading: isSubscriberStatsLoading} = useSubscriberCountWithRange(
        range,
        selectedNewsletterId || undefined,
        shouldFetchStats
    );

    // Find the selected newsletter to get its active_members count
    const selectedNewsletter = useMemo(() => {
        if (!newslettersData?.newsletters || !selectedNewsletterId) {
            return null;
        }
        return newslettersData.newsletters.find(n => n.id === selectedNewsletterId) || null;
    }, [newslettersData, selectedNewsletterId]);

    // Calculate totals for KPIs
    const totals = useMemo(() => {
        // Get total subscribers from the selected newsletter or all newsletters
        const totalSubscribers = selectedNewsletter?.count?.active_members ||
            subscriberStatsData?.stats?.[0]?.total ||
            0;

        // Calculate average open and click rates from newsletter stats
        if (!newsletterStatsData?.stats || newsletterStatsData.stats.length === 0) {
            return {
                totalSubscribers,
                avgOpenRate: 0,
                avgClickRate: 0
            };
        }

        const allStats = newsletterStatsData.stats;
        const totalOpenRate = allStats.reduce((sum, stat) => sum + (stat.open_rate || 0), 0);
        const totalClickRate = allStats.reduce((sum, stat) => sum + (stat.click_rate || 0), 0);

        return {
            totalSubscribers,
            avgOpenRate: totalOpenRate / allStats.length,
            avgClickRate: totalClickRate / allStats.length
        };
    }, [selectedNewsletter, subscriberStatsData, newsletterStatsData]);

    // Prepare newsletter stats for sorting and display
    const newsletterStats = useMemo(() => {
        if (!newsletterStatsData?.stats || newsletterStatsData.stats.length === 0) {
            return [];
        }

        // Clone the data for sorting
        const stats = [...newsletterStatsData.stats];

        // Apply client-side sorting
        const [field, direction = 'desc'] = sortBy.split(' ');

        return stats.sort((a, b) => {
            let valueA, valueB;

            // Handle different sort fields
            if (field === 'date') {
                valueA = new Date(a.send_date).getTime();
                valueB = new Date(b.send_date).getTime();
            } else if (field === 'open_rate') {
                valueA = a.open_rate || 0;
                valueB = b.open_rate || 0;
            } else if (field === 'click_rate') {
                valueA = a.click_rate || 0;
                valueB = b.click_rate || 0;
            } else if (field === 'sent_to') {
                valueA = a.sent_to || 0;
                valueB = b.sent_to || 0;
            } else {
                return 0;
            }

            // Apply sort direction
            return direction === 'desc' ? valueB - valueA : valueA - valueB;
        });
    }, [newsletterStatsData, sortBy]);

    // Create subscribers data from newsletter subscriber stats
    const subscribersData = useMemo(() => {
        if (!subscriberStatsData?.stats?.[0]?.deltas || subscriberStatsData.stats[0].deltas.length === 0) {
            return [];
        }

        // Convert to the required format - already in the correct format
        return subscriberStatsData.stats[0].deltas;
    }, [subscriberStatsData]);

    // Convert string dates to Date objects for AvgsDataItem compatibility
    const avgsData: AvgsDataItem[] = newsletterStats.map(stat => ({
        ...stat,
        send_date: new Date(stat.send_date)
    }));

    // Separate loading states for different sections
    const isKPIsLoading = isNewslettersLoading || isSubscriberStatsLoading || isStatsLoading;
    const isTableLoading = isStatsLoading || !newsletterStatsData;

    const pageData = isKPIsLoading ? undefined : (selectedNewsletterId && subscribersData.length > 1 && newsletterStats.length > 1 ? ['data exists'] : []);

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
                            isAvgsLoading={isStatsLoading}
                            isLoading={isKPIsLoading}
                            subscribersData={subscribersData}
                            totals={totals}
                        />
                    </CardContent>
                </Card>
                {isTableLoading
                    ?
                    <Card className='min-h-[460px]'>
                        <CardHeader>
                            <CardTitle>Top newsletters</CardTitle>
                            <CardDescription> Your best performing newsletters {getPeriodText(range)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SkeletonTable lines={5} />
                        </CardContent>
                    </Card>
                    :
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
                                    {newsletterStats.map(post => (
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
                }
            </StatsView>
        </StatsLayout>
    );
};

// Export the component directly now that we handle the feature flag in routes.tsx
export default Newsletters;
