import DateRangeSelect from '../components/DateRangeSelect';
import GrowthKPIs from './components/GrowthKPIs';
import React, {useMemo, useState} from 'react';
import SortButton from '../components/SortButton';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Separator, SkeletonTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, centsToDollars, formatNumber} from '@tryghost/shade';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import {useTopPostsStatsWithRange} from '@src/hooks/useTopPostsStatsWithRange';

// Define content types
const CONTENT_TYPES = {
    POSTS: 'posts',
    PAGES: 'pages',
    POSTS_AND_PAGES: 'posts_and_pages'
} as const;

type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

const CONTENT_TYPE_OPTIONS: Array<{value: ContentType; label: string}> = [
    {value: CONTENT_TYPES.POSTS, label: 'Posts'},
    {value: CONTENT_TYPES.PAGES, label: 'Pages'},
    {value: CONTENT_TYPES.POSTS_AND_PAGES, label: 'Posts & pages'}
];

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
    const [selectedContentType, setSelectedContentType] = useState<ContentType>(CONTENT_TYPES.POSTS_AND_PAGES);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get the initial tab from URL search parameters
    const initialTab = searchParams.get('tab') || 'total-members';

    // Get stats from custom hook once
    const {isLoading, chartData, totals, currencySymbol} = useGrowthStats(range);

    // Get growth data with post_type filtering
    const {data: topPostsData} = useTopPostsStatsWithRange(range, sortBy, selectedContentType as 'posts' | 'pages' | 'posts_and_pages');

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

    const getContentTypeLabel = () => {
        const option = CONTENT_TYPE_OPTIONS.find(opt => opt.value === selectedContentType);
        return option ? option.label : 'Posts & pages';
    };

    const getContentTitle = () => {
        switch (selectedContentType) {
        case CONTENT_TYPES.POSTS:
            return 'Top posts';
        case CONTENT_TYPES.PAGES:
            return 'Top pages';
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
                {isPageLoading
                    ?
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
                    <Card className='min-h-[460px]'>
                        <div className="flex items-start justify-between">
                            <CardHeader>
                                <CardTitle>{getContentTitle()}</CardTitle>
                                <CardDescription>{getContentDescription()}</CardDescription>
                            </CardHeader>
                            <DropdownMenu>
                                <DropdownMenuTrigger className='mr-6 mt-6' asChild>
                                    <Button variant="dropdown">{getContentTypeLabel()}</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                    {CONTENT_TYPE_OPTIONS.map(option => (
                                        <DropdownMenuItem
                                            key={option.value}
                                            onClick={() => setSelectedContentType(option.value)}
                                        >
                                            {option.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CardContent>
                            <Separator/>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                        Title
                                        </TableHead>
                                        <TableHead className='text-right'>
                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='free_members desc'>
                                            Free members
                                            </SortButton>
                                        </TableHead>
                                        <TableHead className='text-right'>
                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='paid_members desc'>
                                            Paid members
                                            </SortButton>
                                        </TableHead>
                                        <TableHead className='text-right'>
                                            <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='mrr desc'>
                                            MRR impact
                                            </SortButton>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transformedTopPosts.map(post => (
                                        <TableRow key={post.post_id}>
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
                                                    {/* <a className='-mx-2 inline-flex min-h-6 items-center gap-1 rounded-sm px-2 opacity-0 hover:underline group-hover/link:opacity-75' href={`${row.pathname}`} rel="noreferrer" target='_blank'>
                                                    <LucideIcon.SquareArrowOutUpRight size={12} strokeWidth={2.5} />
                                                </a> */}
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
                            </Table>
                        </CardContent>
                    </Card>
                }
            </StatsView>
        </StatsLayout>
    );
};

export default Growth;
