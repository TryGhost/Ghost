// import AudienceSelect from './components/AudienceSelect';
import Feedback from './components/Feedback';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChartConfig, HTable, Input, LucideIcon, Separator, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, SkeletonTable, formatNumber, formatPercentage, useSimplePagination} from '@tryghost/shade';
import {NewsletterRadialChart, NewsletterRadialChartData} from './components/NewsLetterRadialChart';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {getLinkById} from '@src/utils/link-helpers';
import {hasBeenEmailed, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useEditLinks} from '@src/hooks/useEditLinks';
import {useEffect, useMemo, useRef, useState} from 'react';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

interface postAnalyticsProps {}

const FunnelArrow: React.FC = () => {
    return (
        <div className='absolute -right-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground'>
            <LucideIcon.ChevronRight className='ml-0.5' size={16} strokeWidth={1.5}/>
        </div>
    );
};

interface BlockTooltipProps {
    dataColor: string;
    value: string;
    avgValue: string;
}

const BlockTooltip:React.FC<BlockTooltipProps> = ({
    dataColor,
    value,
    avgValue
}) => {
    return (
        <div className='absolute left-1/2 top-6 z-50 flex w-[200px] -translate-x-1/2 flex-col items-stretch gap-1.5 rounded-md bg-background px-4 py-2 text-sm opacity-0 shadow-md transition-all group-hover/block:top-3 group-hover/block:opacity-100'>
            <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-2 text-muted-foreground'>
                    <div className='size-2 rounded-full bg-chart-blue opacity-50'
                        style={{
                            backgroundColor: dataColor
                        }}
                    ></div>
                    This newsletter
                </div>
                <div className='text-right font-mono'>
                    {value}
                </div>
            </div>
            <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-2 text-muted-foreground'>
                    <div className='size-2 rounded-full bg-chart-gray opacity-80'></div>
                    Average
                </div>
                <div className='text-right font-mono'>
                    {avgValue}
                </div>
            </div>
        </div>
    );
};

const Newsletter: React.FC<postAnalyticsProps> = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [editedUrl, setEditedUrl] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 5;

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: 'email,count.positive_feedback,count.negative_feedback'
        }
    });

    const typedPost = post as Post;
    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(typedPost);

    useEffect(() => {
        // Redirect to overview if the post wasn't sent as a newsletter
        if (!isPostLoading && !showNewsletterSection) {
            navigate(`/analytics/beta/${postId}`);
        }
    }, [navigate, postId, isPostLoading, showNewsletterSection]);

    const {stats, averageStats, topLinks, isLoading: isNewsletterStatsLoading, refetchTopLinks} = usePostNewsletterStats(postId || '');
    const {editLinks} = useEditLinks();

    // Calculate feedback stats from the post data
    const feedbackStats = useMemo(() => {
        if (!typedPost?.count) {
            return {
                positiveFeedback: 0,
                negativeFeedback: 0,
                totalFeedback: 0
            };
        }

        const positiveFeedback = typedPost.count.positive_feedback || 0;
        const negativeFeedback = typedPost.count.negative_feedback || 0;
        const totalFeedback = positiveFeedback + negativeFeedback;

        return {
            positiveFeedback,
            negativeFeedback,
            totalFeedback
        };
    }, [typedPost]);

    const handleEdit = (linkId: string) => {
        const link = getLinkById(topLinks, linkId);
        if (link) {
            setEditingLinkId(linkId);
            setEditedUrl(link.link.to);
        }
    };

    const handleUpdate = () => {
        if (!editingLinkId) {
            return;
        }
        const link = getLinkById(topLinks, editingLinkId);
        if (!link) {
            return;
        }
        const trimmedUrl = editedUrl.trim();
        if (trimmedUrl === '' || trimmedUrl === link.link.to) {
            setEditingLinkId(null);
            setEditedUrl('');
            return;
        }
        editLinks({
            originalUrl: link.link.originalTo,
            editedUrl: editedUrl,
            postId: postId || ''
        }, {
            onSuccess: () => {
                setEditingLinkId(null);
                setEditedUrl('');
                refetchTopLinks();
            }
        });
    };

    // Pagination for topLinks
    const {
        totalPages,
        paginatedData: paginatedTopLinks,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage
    } = useSimplePagination({
        data: topLinks,
        itemsPerPage: ITEMS_PER_PAGE
    });

    useEffect(() => {
        if (editingLinkId && inputRef.current) {
            inputRef.current.focus();
            const link = getLinkById(topLinks, editingLinkId);

            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    if (editedUrl === link?.link.to) {
                        setEditingLinkId(null);
                        setEditedUrl('');
                    }
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [editingLinkId, editedUrl, topLinks]);

    const isLoading = isNewsletterStatsLoading || isPostLoading;

    // "Sent" Chart
    const sentChartData: NewsletterRadialChartData[] = [
        {datatype: 'Sent', value: 1, fill: 'url(#gradientPurple)', color: 'hsl(var(--chart-purple))'}
    ];

    const sentChartConfig = {
        percentage: {
            label: 'O'
        },
        Average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    // "Opened" Chart
    const openedChartData: NewsletterRadialChartData[] = [
        {datatype: 'Average', value: averageStats.openedRate, fill: 'url(#gradientGray)', color: 'hsl(var(--chart-gray))'},
        {datatype: 'This newsletter', value: stats.openedRate, fill: 'url(#gradientBlue)', color: 'hsl(var(--chart-blue))'}
    ];

    const openedChartConfig = {
        percentage: {
            label: 'Opened'
        },
        Average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    // "Clicked" Chart
    const clickedChartData: NewsletterRadialChartData[] = [
        {datatype: 'Average', value: averageStats.clickedRate, fill: 'url(#gradientGray)', color: 'hsl(var(--chart-gray))'},
        {datatype: 'This newsletter', value: stats.clickedRate, fill: 'url(#gradientTeal)', color: 'hsl(var(--chart-teal))'}
    ];

    const clickedChartConfig = {
        percentage: {
            label: 'Clicked'
        },
        Average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    return (
        <>
            <PostAnalyticsHeader currentTab='Newsletter' />
            <PostAnalyticsContent>

                <div className='grid grid-cols-2 gap-8'>
                    <Card className='col-span-2'>
                        <CardHeader className='hidden'>
                            <CardTitle>Newsletters</CardTitle>
                            <CardDescription>How did this post perform</CardDescription>
                        </CardHeader>
                        {isLoading ?
                            <CardContent className='h-[25vw] p-6'>
                                <BarChartLoadingIndicator />
                            </CardContent>
                            :
                            <CardContent className='p-0'>
                                <div className='grid grid-cols-3 items-stretch border-b'>
                                    <KpiCard className='relative grow'>
                                        {/* <FunnelArrow /> */}
                                        <KpiCardLabel>
                                            <div className='ml-0.5 size-[9px] rounded-full bg-chart-purple opacity-50'></div>
                                            {/* <LucideIcon.Send strokeWidth={1.5} /> */}
                                    Sent
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.sent)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='relative grow'>
                                        {/* <FunnelArrow /> */}
                                        <KpiCardLabel>
                                            <div className='ml-0.5 size-[9px] rounded-full bg-chart-blue opacity-50'></div>
                                            {/* <LucideIcon.Eye strokeWidth={1.5} /> */}
                                    Opened
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.opened)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <div className='ml-0.5 size-[9px] rounded-full bg-chart-teal opacity-50'></div>
                                            {/* <LucideIcon.MousePointer strokeWidth={1.5} /> */}
                                    Clicked
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.clicked)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                                <div className='mx-auto grid grid-cols-3 items-center justify-center transition-all'>
                                    <div className='relative border-r px-6'>
                                        <NewsletterRadialChart
                                            className='aspect-square'
                                            config={sentChartConfig}
                                            data={sentChartData}
                                            percentageLabel='Sent'
                                            percentageValue={formatPercentage(1)}
                                            tooltip={false}
                                        />
                                        <FunnelArrow />
                                    </div>
                                    <div className='group/block relative border-r px-6 transition-all hover:bg-muted/25'>
                                        <BlockTooltip
                                            avgValue={formatPercentage(averageStats.openedRate)}
                                            dataColor='hsl(var(--chart-blue))'
                                            value={formatPercentage(stats.openedRate)}
                                        />
                                        <NewsletterRadialChart
                                            className='aspect-square'
                                            config={openedChartConfig}
                                            data={openedChartData}
                                            percentageLabel='Open rate'
                                            percentageValue={formatPercentage(stats.openedRate)}
                                            tooltip={false}
                                        />
                                        <FunnelArrow />
                                    </div>
                                    <div className='group/block relative px-6 transition-all hover:bg-muted/25'>
                                        <BlockTooltip
                                            avgValue={formatPercentage(averageStats.clickedRate)}
                                            dataColor='hsl(var(--chart-teal))'
                                            value={formatPercentage(stats.clickedRate)}
                                        />
                                        <NewsletterRadialChart
                                            className='aspect-square'
                                            config={clickedChartConfig}
                                            data={clickedChartData}
                                            percentageLabel='Click rate'
                                            percentageValue={formatPercentage(stats.clickedRate)}
                                            tooltip={false}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        }
                    </Card>
                    <Feedback feedbackStats={feedbackStats} />
                    <Card>
                        <div className='flex items-center justify-between p-6'>
                            <CardHeader className='p-0'>
                                <CardTitle>Newsletter clicks</CardTitle>
                                <CardDescription>Which links resonated with your readers</CardDescription>
                            </CardHeader>
                            <HTable className='mr-2'>No. of members</HTable>
                        </div>
                        {isLoading ?
                            <CardContent className='p-6'>
                                <Separator />
                                <SkeletonTable />
                            </CardContent>
                            :
                            <CardContent className='pb-0'>
                                <Separator />
                                {topLinks.length > 0 ?
                                    <div className='flex w-full flex-col py-3'>
                                        {paginatedTopLinks?.map((row) => {
                                            const linkId = row.link.link_id;
                                            const title = row.link.title;
                                            const url = row.link.to;
                                            const edited = row.link.edited;

                                            return (
                                                <div key={linkId} className='flex h-10 w-full items-center justify-between gap-3 rounded-sm border-none px-2 text-sm hover:cursor-pointer hover:bg-accent'>
                                                    <div className='flex grow items-center gap-2 overflow-hidden'>
                                                        {editingLinkId === linkId ? (
                                                            <div ref={containerRef} className='flex w-full items-center gap-2'>
                                                                <Input
                                                                    ref={inputRef}
                                                                    className="h-7 w-full border-border bg-background text-sm"
                                                                    value={editedUrl}
                                                                    onChange={e => setEditedUrl(e.target.value)}
                                                                />
                                                                <Button
                                                                    size='sm'
                                                                    onClick={handleUpdate}
                                                                >
                                                                        Update
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    className='shrink-0 bg-background'
                                                                    size='sm'
                                                                    variant='outline'
                                                                    onClick={() => handleEdit(linkId)}
                                                                >
                                                                    <LucideIcon.Pen />
                                                                </Button>
                                                                <a
                                                                    className='block truncate font-medium hover:underline'
                                                                    href={url}
                                                                    rel="noreferrer"
                                                                    target='_blank'
                                                                    title={title}
                                                                >
                                                                    {title}
                                                                </a>
                                                                {edited && (
                                                                    <span className='text-xs text-gray-500'>(edited)</span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className='font-mono'>
                                                        {formatNumber(row.count)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    :
                                    <div className='py-20 text-center text-sm text-gray-700'>
                                        You have no links in your post.
                                    </div>
                                }
                            </CardContent>
                        }

                        {!isLoading && topLinks.length > 1 &&
                                <CardFooter>
                                    <div className='flex w-full items-start justify-between gap-3'>
                                        <div className='mt-1 flex items-start gap-2 pl-4 text-sm text-green'>
                                            <LucideIcon.ArrowUp size={20} strokeWidth={1.5} />
                                            Sent a broken link? You can update it!
                                        </div>
                                        {totalPages > 1 && (
                                            <SimplePagination className='pb-0'>
                                                <SimplePaginationNavigation>
                                                    <SimplePaginationPreviousButton
                                                        disabled={!hasPreviousPage}
                                                        onClick={previousPage}
                                                        // size='default'
                                                    />
                                                    <SimplePaginationNextButton
                                                        disabled={!hasNextPage}
                                                        onClick={nextPage}
                                                        // size='default'
                                                    />
                                                </SimplePaginationNavigation>
                                            </SimplePagination>
                                        )}
                                    </div>
                                </CardFooter>
                        }
                    </Card>
                </div>
            </PostAnalyticsContent>
        </>
    );
};

export default Newsletter;
