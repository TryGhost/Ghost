// import AudienceSelect from './components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import NewsletterKPIs from './components/NewslettersKPIs';
import NewsletterSelect from '../components/NewsletterSelect';
import React, {useMemo, useState} from 'react';
import SortButton from '../components/SortButton';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator, SkeletonTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useNewsletterStatsWithRange, useSubscriberCountWithRange} from '@src/hooks/useNewsletterStatsWithRange';
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

    // Get stats from real data using the new hooks with selected newsletter
    const {data: newsletterStatsData, isLoading: isStatsLoading} = useNewsletterStatsWithRange(
        range,
        sortBy,
        selectedNewsletterId || undefined
    );
    const {data: subscriberStatsData, isLoading: isSubscriberStatsLoading} = useSubscriberCountWithRange(
        range,
        selectedNewsletterId || undefined
    );

    // Prepare the data - wrap in useMemo to avoid dependency changes
    const newsletterStats = useMemo(() => {
        if (!newsletterStatsData?.stats || newsletterStatsData?.stats.length === 0) {
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
            } else {
                return 0;
            }

            // Apply sort direction
            return direction === 'desc' ? valueB - valueA : valueA - valueB;
        });
    }, [newsletterStatsData, sortBy]);

    // Calculate totals
    const totals = useMemo(() => {
        if (!newsletterStatsData?.stats || newsletterStatsData.stats.length === 0) {
            return {
                totalSubscribers: subscriberStatsData?.stats?.[0]?.total || 0,
                avgOpenRate: 0,
                avgClickRate: 0
            };
        }

        // Use all stats for calculating averages, not just the sorted/limited ones
        const allStats = newsletterStatsData.stats;

        // Calculate average open and click rates from all stats
        const totalOpenRate = allStats.reduce((sum, stat) => sum + (stat.open_rate || 0), 0);
        const totalClickRate = allStats.reduce((sum, stat) => sum + (stat.click_rate || 0), 0);

        return {
            totalSubscribers: subscriberStatsData?.stats?.[0]?.total || 0,
            avgOpenRate: totalOpenRate / allStats.length,
            avgClickRate: totalClickRate / allStats.length
        };
    }, [newsletterStatsData, subscriberStatsData]);

    // Create subscribers data from newsletter subscriber stats
    const subscribersData = useMemo(() => {
        if (!subscriberStatsData?.stats?.[0]?.deltas || subscriberStatsData.stats?.[0]?.deltas.length === 0) {
            return [];
        }

        // Convert to the required format - already in the correct format
        return subscriberStatsData.stats[0].deltas;
    }, [subscriberStatsData]);

    const isPageLoading = isStatsLoading || isSubscriberStatsLoading;

    // Convert string dates to Date objects for AvgsDataItem compatibility
    const avgsData: AvgsDataItem[] = newsletterStats.map(stat => ({
        ...stat,
        send_date: new Date(stat.send_date)
    }));

    const pageData = isPageLoading ? undefined : (selectedNewsletterId && subscribersData.length > 1 && newsletterStats.length > 1 ? ['data exists'] : []);

    return (
        <StatsLayout>
            <StatsHeader>
                <NewsletterSelect />
                <DateRangeSelect />
            </StatsHeader>
            <StatsView data={pageData} isLoading={false} loadingComponent={<></>}>
                <Card>
                    <CardContent>
                        <NewsletterKPIs avgsData={avgsData} isLoading={isSubscriberStatsLoading} subscribersData={subscribersData} totals={totals} />
                    </CardContent>
                </Card>
                {isStatsLoading
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
                        <CardHeader>
                            <CardTitle>Top newsletters</CardTitle>
                            <CardDescription> Your best performing newsletters {getPeriodText(range)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Separator/>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                        Title
                                        </TableHead>
                                        <TableHead className='w-[60px]'>
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
                                        <TableRow key={post.post_id}>
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
                                                <span className="group-hover:hidden">{formatPercentage(post.click_rate)}</span>
                                                <span className="hidden group-hover:!visible group-hover:!block">{formatNumber(post.total_clicks)}</span>
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
