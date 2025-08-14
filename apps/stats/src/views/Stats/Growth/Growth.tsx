import DateRangeSelect from '../components/DateRangeSelect';
import GrowthKPIs from './components/GrowthKPIs';
import GrowthSources from './components/GrowthSources';
import React, {useMemo, useState} from 'react';
import SortButton from '../components/SortButton';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyIndicator, LucideIcon, SkeletonTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, TabsTrigger, centsToDollars, formatDisplayDate, formatNumber} from '@tryghost/shade';
import {CONTENT_TYPES, ContentType, getContentTitle, getGrowthContentDescription} from '@src/utils/content-helpers';
import {getClickHandler} from '@src/utils/url-helpers';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useAppContext} from '@src/App';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';
import {useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import {useTopPostsStatsWithRange} from '@src/hooks/useTopPostsStatsWithRange';
import type {TopPostStatItem} from '@tryghost/admin-x-framework/api/stats';

// Type for unified content data that combines top content with growth metrics
interface UnifiedGrowthContentData {
    pathname?: string;
    attribution_url: string;
    attribution_type: string;
    attribution_id: string;
    title: string;
    post_id?: string;
    post_uuid?: string;
    free_members: number;
    paid_members: number;
    mrr: number;
    percentage?: number;
    published_at: string;
    url_exists?: boolean;
}

type TopPostsOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc';
type SourcesOrder = 'free_members desc' | 'paid_members desc' | 'mrr desc' | 'source desc';
type UnifiedSortOrder = TopPostsOrder | SourcesOrder;

const Growth: React.FC = () => {
    const {range, site} = useGlobalData();
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState<UnifiedSortOrder>('free_members desc');
    const [selectedContentType, setSelectedContentType] = useState<ContentType>(CONTENT_TYPES.POSTS_AND_PAGES);
    const [searchParams] = useSearchParams();
    const {appSettings} = useAppContext();

    // Get the initial tab from URL search parameters
    const initialTab = searchParams.get('tab') || 'total-members';

    // Get stats from custom hook once
    const {isLoading, chartData, totals, currencySymbol, subscriptionData} = useGrowthStats(range);

    // Get growth data with post_type filtering - only call when not on Sources tab
    const {data: topPostsData} = useTopPostsStatsWithRange(
        range,
        sortBy as TopPostsOrder,
        selectedContentType as 'posts' | 'pages' | 'posts_and_pages'
    );

    // Sources data is now handled by the GrowthSources component

    // Transform and deduplicate data for display
    const transformedTopPosts = useMemo<UnifiedGrowthContentData[]>(() => {
        const growthData = topPostsData?.stats || [];

        // First deduplicate by post_id/title to handle backend duplicates
        const uniqueData = growthData.reduce((acc: Map<string, TopPostStatItem>, item: TopPostStatItem) => {
            const key = item.post_id || (item.title && item.title.trim() !== '' ? item.title : item.attribution_url);
            if (!key) {
                // Skip items that have no valid key - this should not happen with proper backend data
                return acc;
            }
            if (!acc.has(key)) {
                acc.set(key, item);
            } else {
                // If duplicate, sum the metrics
                const existing = acc.get(key)!;
                existing.free_members += item.free_members;
                existing.paid_members += item.paid_members;
                existing.mrr += item.mrr;
                acc.set(key, existing);
            }
            return acc;
        }, new Map<string, TopPostStatItem>());

        const filteredData = Array.from(uniqueData.values());

        // Calculate total metrics for the filtered dataset for percentage calculation
        const totalFreeMembers = filteredData.reduce((sum: number, item: TopPostStatItem) => sum + item.free_members, 0);
        const totalPaidMembers = filteredData.reduce((sum: number, item: TopPostStatItem) => sum + item.paid_members, 0);
        const totalMrr = filteredData.reduce((sum: number, item: TopPostStatItem) => sum + item.mrr, 0);

        // Add percentage based on current sort
        return filteredData.map((item: TopPostStatItem) => {
            let percentage = 0;
            if (sortBy.includes('free_members') && totalFreeMembers > 0) {
                percentage = item.free_members / totalFreeMembers;
            } else if (sortBy.includes('paid_members') && totalPaidMembers > 0) {
                percentage = item.paid_members / totalPaidMembers;
            } else if (sortBy.includes('mrr') && totalMrr > 0) {
                percentage = item.mrr / totalMrr;
            }

            return {
                title: item.title || item.attribution_url,
                post_id: item.post_id,
                attribution_url: item.attribution_url,
                attribution_type: item.attribution_type,
                attribution_id: item.attribution_id,
                free_members: item.free_members,
                paid_members: item.paid_members,
                mrr: item.mrr,
                percentage,
                published_at: item.published_at,
                url_exists: item.url_exists ?? true
            };
        });
    }, [topPostsData, sortBy]);

    const isPageLoading = isLoading;

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect />
            </StatsHeader>
            <StatsView data={isPageLoading ? undefined : chartData} isLoading={false} loadingComponent={<></>}>
                <Card data-testid='total-members-card'>
                    <CardContent>
                        <GrowthKPIs
                            chartData={chartData}
                            currencySymbol={currencySymbol}
                            initialTab={initialTab}
                            isLoading={isPageLoading}
                            subscriptionData={subscriptionData}
                            totals={totals}
                        />
                    </CardContent>
                </Card>
                {isPageLoading ?
                    <Card className='min-h-[460px]'>
                        <CardHeader>
                            <CardTitle>{getContentTitle(selectedContentType)}</CardTitle>
                            <CardDescription>{getGrowthContentDescription(selectedContentType, range, getPeriodText)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SkeletonTable lines={5} />
                        </CardContent>
                    </Card>
                    :
                    <Card className='w-full max-w-[calc(100vw-64px)] overflow-x-auto sidebar:max-w-[calc(100vw-64px-280px)]' data-testid='top-content-card'>
                        <CardHeader>
                            <CardTitle>{getContentTitle(selectedContentType)}</CardTitle>
                            <CardDescription>{getGrowthContentDescription(selectedContentType, range, getPeriodText)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className='[&>th]:h-auto [&>th]:pb-2 [&>th]:pt-0'>
                                        <TableHead className='min-w-[320px] pl-0'>
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
                                            {appSettings?.paidMembersEnabled ?
                                                <SortButton activeSortBy={sortBy} setSortBy={setSortBy} sortBy='free_members desc'>
                                                Free members
                                                </SortButton>
                                                :
                                                <>Free members</>
                                            }
                                        </TableHead>
                                        {appSettings?.paidMembersEnabled &&
                                        <>
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
                                        </>
                                        }
                                    </TableRow>
                                </TableHeader>
                                {selectedContentType === CONTENT_TYPES.SOURCES ?
                                    <GrowthSources
                                        limit={20}
                                        range={range}
                                        setSortBy={(newSortBy: SourcesOrder) => setSortBy(newSortBy)}
                                        showViewAll={true}
                                        sortBy={sortBy as SourcesOrder}
                                    />
                                    :
                                    <TableBody>
                                        {!appSettings?.analytics.membersTrackSources ? (
                                            <TableRow className='last:border-none'>
                                                <TableCell className='border-none py-12 group-hover:!bg-transparent' colSpan={appSettings?.paidMembersEnabled ? 4 : 2}>
                                                    <EmptyIndicator
                                                        actions={
                                                            <Button variant='outline' onClick={() => navigate('/settings/analytics', {crossApp: true})}>
                                                                Open settings
                                                            </Button>
                                                        }
                                                        description='Enable member source tracking in settings to see which content drives member growth.'
                                                        title='Member sources have been disabled'
                                                    >
                                                        <LucideIcon.Activity />
                                                    </EmptyIndicator>
                                                </TableCell>
                                            </TableRow>
                                        ) : transformedTopPosts.length > 0 ? (
                                            transformedTopPosts.map((post, index) => (
                                                <TableRow key={`${selectedContentType}-${post.post_id || `${post.title}-${index}`}`} className='last:border-none'>
                                                    <TableCell>
                                                        <div className='group/link inline-flex flex-col items-start gap-px'>
                                                            {post.post_id && post.attribution_type === 'post' ?
                                                                <Button
                                                                    className='h-auto whitespace-normal p-0 text-left font-medium leading-tight hover:!underline'
                                                                    title='View post analytics'
                                                                    variant='link'
                                                                    onClick={getClickHandler(post.attribution_url, post.post_id, site.url || '', navigate, post.attribution_type)}
                                                                >
                                                                    {post.title}
                                                                </Button>
                                                                :
                                                                <span className='font-medium'>
                                                                    {post.title}
                                                                </span>
                                                            }
                                                            {post.published_at && formatDisplayDate && new Date(post.published_at).getTime() > 0 && (
                                                                <span className='text-muted-foreground'>Published on {formatDisplayDate(post.published_at)}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>
                                                        {(post.free_members > 0 && '+')}{formatNumber(post.free_members)}
                                                    </TableCell>
                                                    {appSettings?.paidMembersEnabled &&
                                                    <>
                                                        <TableCell className='text-right font-mono text-sm'>
                                                            {(post.paid_members > 0 && '+')}{formatNumber(post.paid_members)}
                                                        </TableCell>
                                                        <TableCell className='text-right font-mono text-sm'>
                                                            {(post.mrr > 0 && '+')}{currencySymbol}{centsToDollars(post.mrr).toFixed(0)}
                                                        </TableCell>
                                                    </>
                                                    }
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow className='border-none'>
                                                <TableCell className='py-12 group-hover:!bg-transparent' colSpan={appSettings?.paidMembersEnabled ? 4 : 2}>
                                                    <EmptyIndicator
                                                        description='Try adjusting your date range to see more data.'
                                                        title={`No conversions ${getPeriodText(range)}`}
                                                    >
                                                        <LucideIcon.ChartColumnIncreasing strokeWidth={1.5} />
                                                    </EmptyIndicator>
                                                </TableCell>
                                            </TableRow>
                                        )}
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
