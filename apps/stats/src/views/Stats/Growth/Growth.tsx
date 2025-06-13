import DateRangeSelect from '../components/DateRangeSelect';
import GrowthKPIs from './components/GrowthKPIs';
import GrowthSources from './components/GrowthSources';
import React, {useMemo, useState} from 'react';
import SortButton from '../components/SortButton';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, SkeletonTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, TabsTrigger, centsToDollars, formatNumber} from '@tryghost/shade';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import {useTopPostsStatsWithRange} from '@src/hooks/useTopPostsStatsWithRange';

// Define content types
export const CONTENT_TYPES = {
    POSTS: 'posts',
    PAGES: 'pages',
    POSTS_AND_PAGES: 'posts_and_pages',
    SOURCES: 'sources'
} as const;

type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

// Type for unified content data that combines top content with growth metrics
interface UnifiedGrowthContentData {
    pathname?: string;
    title: string;
    post_id?: string;
    post_uuid?: string;
    free_members: number;
    paid_members: number;
    mrr: number;
    percentage?: number;
}

type TopPostsOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc';

const Growth: React.FC = () => {
    const {range} = useGlobalData();
    const [sortBy, setSortBy] = useState<TopPostsOrder>('free_members desc');
    const [selectedContentType, setSelectedContentType] = useState<ContentType>(CONTENT_TYPES.POSTS);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get the initial tab from URL search parameters
    const initialTab = searchParams.get('tab') || 'total-members';

    // Get stats from custom hook once
    const {isLoading, chartData, totals, currencySymbol} = useGrowthStats(range);

    // Get growth data with post_type filtering
    const {data: topPostsData} = useTopPostsStatsWithRange(range, sortBy, selectedContentType as 'posts' | 'pages' | 'posts_and_pages');

    // Sources data is now handled by the GrowthSources component

    // Transform data for display
    const transformedTopPosts = useMemo((): UnifiedGrowthContentData[] => {
        const growthData = topPostsData?.stats || [];
        const filteredData = growthData;

        // Calculate total metrics for the filtered dataset for percentage calculation
        const totalFreeMembers = filteredData.reduce((sum, item) => sum + item.free_members, 0);
        const totalPaidMembers = filteredData.reduce((sum, item) => sum + item.paid_members, 0);
        const totalMrr = filteredData.reduce((sum, item) => sum + item.mrr, 0);

        // Add percentage based on current sort
        return filteredData.map((item) => {
            let percentage = 0;
            if (sortBy.includes('free_members') && totalFreeMembers > 0) {
                percentage = item.free_members / totalFreeMembers;
            } else if (sortBy.includes('paid_members') && totalPaidMembers > 0) {
                percentage = item.paid_members / totalPaidMembers;
            } else if (sortBy.includes('mrr') && totalMrr > 0) {
                percentage = item.mrr / totalMrr;
            }

            return {
                title: item.title,
                post_id: item.post_id,
                free_members: item.free_members,
                paid_members: item.paid_members,
                mrr: item.mrr,
                percentage
            };
        });
    }, [topPostsData, sortBy]);

    const getContentTitle = () => {
        switch (selectedContentType) {
        case CONTENT_TYPES.POSTS:
            return 'Top posts';
        case CONTENT_TYPES.PAGES:
            return 'Top pages';
        case CONTENT_TYPES.SOURCES:
            return 'Top sources';
        default:
            return 'Top content';
        }
    };

    const getContentDescription = () => {
        switch (selectedContentType) {
        case CONTENT_TYPES.POSTS:
            return `Which posts drove the most growth ${getPeriodText(range)}`;
        case CONTENT_TYPES.PAGES:
            return `Which pages drove the most growth ${getPeriodText(range)}`;
        case CONTENT_TYPES.POSTS_AND_PAGES:
            return `Which posts or pages drove the most growth ${getPeriodText(range)}`;
        case CONTENT_TYPES.SOURCES:
            return `How readers found your site ${getPeriodText(range)}`;
        default:
            return `Which posts drove the most growth ${getPeriodText(range)}`;
        }
    };

    const isPageLoading = isLoading;

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect />
            </StatsHeader>
            <StatsView data={isPageLoading ? undefined : chartData} isLoading={false} loadingComponent={<></>}>
                <Card>
                    <CardContent>
                        <GrowthKPIs
                            chartData={chartData}
                            currencySymbol={currencySymbol}
                            initialTab={initialTab}
                            isLoading={isPageLoading}
                            totals={totals}
                        />
                    </CardContent>
                </Card>
                {isPageLoading ?
                    <Card className='min-h-[460px]'>
                        <CardHeader>
                            <CardTitle>{getContentTitle()}</CardTitle>
                            <CardDescription>{getContentDescription()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SkeletonTable lines={5} />
                        </CardContent>
                    </Card>
                    :
                    <Card>
                        <CardHeader>
                            <CardTitle>{getContentTitle()}</CardTitle>
                            <CardDescription>{getContentDescription()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className='[&>th]:h-auto [&>th]:pb-2 [&>th]:pt-0'>
                                        <TableHead className='pl-0'>
                                            <Tabs defaultValue={selectedContentType} variant='button-sm' onValueChange={(value: string) => {
                                                setSelectedContentType(value as ContentType);
                                            }}>
                                                <TabsList>
                                                    <TabsTrigger value={CONTENT_TYPES.POSTS_AND_PAGES}>Posts & pages</TabsTrigger>
                                                    <TabsTrigger value={CONTENT_TYPES.POSTS}>Posts</TabsTrigger>
                                                    <TabsTrigger value={CONTENT_TYPES.PAGES}>Pages</TabsTrigger>
                                                    <TabsTrigger value={CONTENT_TYPES.SOURCES}>Sources</TabsTrigger>
                                                </TabsList>
                                            </Tabs>
                                        </TableHead>
                                        <TableHead className='w-[140px] text-right'>
                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='free_members desc'>
                                                Free members
                                            </SortButton>
                                        </TableHead>
                                        <TableHead className='w-[140px] text-right'>
                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='paid_members desc'>
                                                Paid members
                                            </SortButton>
                                        </TableHead>
                                        <TableHead className='w-[140px] text-right'>
                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='mrr desc'>
                                                MRR impact
                                            </SortButton>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                {selectedContentType === CONTENT_TYPES.SOURCES ?
                                    <GrowthSources
                                        limit={20}
                                        range={range}
                                        showViewAll={true}
                                    />
                                    :
                                    <TableBody>
                                        {transformedTopPosts.map(post => (
                                            <TableRow key={post.post_id} className='last:border-none'>
                                                <TableCell className="font-medium">
                                                    <div className='group/link inline-flex items-center gap-2'>
                                                        {post.post_id ?
                                                            <Button className='h-auto whitespace-normal p-0 text-left hover:!underline' title="View post analytics" variant='link' onClick={() => {
                                                                navigate(`/posts/analytics/beta/${post.post_id}`, {crossApp: true});
                                                            }}>
                                                                {post.title}
                                                            </Button>
                                                            :
                                                            <>
                                                                {post.title}
                                                            </>
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-right font-mono text-sm'>
                                                    {(post.free_members > 0 && '+')}{formatNumber(post.free_members)}
                                                </TableCell>
                                                <TableCell className='text-right font-mono text-sm'>
                                                    {(post.paid_members > 0 && '+')}{formatNumber(post.paid_members)}
                                                </TableCell>
                                                <TableCell className='text-right font-mono text-sm'>
                                                    {(post.mrr > 0 && '+')}{currencySymbol}{centsToDollars(post.mrr).toFixed(0)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                }
                            </Table>
                        </CardContent>
                    </Card>
                }
            </StatsView>
        </StatsLayout>
    );
};

export default Growth;
