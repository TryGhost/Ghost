// import AudienceSelect from './components/AudienceSelect';
import Feedback from './components/Feedback';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChartConfig, DataList, DataListBar, DataListBody, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, HTable, Input, LucideIcon, Separator, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, SkeletonTable, formatNumber, formatPercentage, useSimplePagination} from '@tryghost/shade';
import {NewsletterRadialChart, NewsletterRadialChartData} from './components/NewsLetterRadialChart';
import {Post, useGlobalData} from '@src/providers/PostAnalyticsContext';
import {getLinkById} from '@src/utils/link-helpers';
import {hasBeenEmailed, useNavigate} from '@tryghost/admin-x-framework';
import {useAppContext} from '@src/App';
import {useEditLinks} from '@src/hooks/useEditLinks';
import {useEffect, useMemo, useRef, useState} from 'react';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';
import {useResponsiveChartSize} from '@src/hooks/useResponsiveChartSize';

interface postAnalyticsProps {}

const FunnelArrow: React.FC = () => {
    return (
        <div className='absolute -right-4 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground   md:!visible md:!flex'>
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
    const navigate = useNavigate();
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [editedUrl, setEditedUrl] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 10;
    const {chartSize} = useResponsiveChartSize();
    const {appSettings} = useAppContext();
    const {emailTrackClicks: emailTrackClicksEnabled, emailTrackOpens: emailTrackOpensEnabled} = appSettings?.analytics || {};

    // Use shared post data from context
    const {post, isPostLoading, postId} = useGlobalData();
    const typedPost = post as Post;
    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(typedPost);

    useEffect(() => {
        // Redirect to overview if the post wasn't sent as a newsletter
        if (!isPostLoading && !showNewsletterSection) {
            navigate(`/analytics/${postId}`);
        }
    }, [navigate, postId, isPostLoading, showNewsletterSection]);

    const {stats, averageStats, topLinks, isLoading: isNewsletterStatsLoading, refetchTopLinks} = usePostNewsletterStats(postId);
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

    // Check if feedback is enabled for the newsletter
    const isFeedbackEnabled = useMemo(() => {
        return typedPost?.newsletter?.feedback_enabled === true;
    }, [typedPost]);

    // Determine if feedback component should be shown
    const shouldShowFeedback = useMemo(() => {
        // Show feedback if there's any feedback data, regardless of feedback_enabled setting
        if (feedbackStats.totalFeedback > 0) {
            return true;
        }

        // Show feedback if feedback is enabled (even if no feedback yet)
        return isFeedbackEnabled;
    }, [feedbackStats.totalFeedback, isFeedbackEnabled]);

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
            postId: postId
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

    let chartHeaderClass = 'grid-cols-3';
    let chartClass = 'aspect-[16/10] w-full max-w-[320px] sm:aspect-[2/1] md:aspect-[10/14] md:max-w-none lg:aspect-square';

    if (!emailTrackClicksEnabled || !emailTrackOpensEnabled) {
        chartHeaderClass = 'grid-cols-2';
        chartClass = 'aspect-[16/10] w-full max-w-[320px] sm:aspect-[2/1] md:aspect-square md:max-w-none lg:aspect-[15/10]';
    }
    if (!emailTrackClicksEnabled && !emailTrackOpensEnabled) {
        chartHeaderClass = 'grid-cols-1';
        chartClass = 'aspect-square w-full max-w-[320px] md:max-w-none max-h-[220px] md:max-h-[240px] xl:max-h-[320px]';
    }

    return (
        <>
            <PostAnalyticsHeader currentTab='Newsletter' />
            <PostAnalyticsContent>

                <div className={`grid grid-cols-1 gap-8 ${shouldShowFeedback && emailTrackClicksEnabled && 'lg:grid-cols-2'}`}>
                    <Card className={shouldShowFeedback && emailTrackClicksEnabled ? 'lg:col-span-2' : ''}>
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
                                <div className={`grid ${chartHeaderClass} items-stretch border-b`}>
                                    <KpiCard className='relative grow p-3 md:p-6'>
                                        {/* <FunnelArrow /> */}
                                        <KpiCardLabel>
                                            <div className='ml-0.5 size-[9px] rounded-full bg-chart-purple !text-sm opacity-50 lg:text-base'></div>
                                            {/* <LucideIcon.Send strokeWidth={1.5} /> */}
                                    Sent
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue className='text-xl sm:text-2xl md:text-[2.6rem]'>{formatNumber(stats.sent)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>

                                    {emailTrackOpensEnabled &&
                                        <KpiCard className='relative grow p-3 md:p-6'>
                                            {/* <FunnelArrow /> */}
                                            <KpiCardLabel>
                                                <div className='ml-0.5 size-[9px] rounded-full bg-chart-blue !text-sm opacity-50 lg:text-base'></div>
                                                {/* <LucideIcon.Eye strokeWidth={1.5} /> */}
                                        Opened
                                            </KpiCardLabel>
                                            <KpiCardContent>
                                                <KpiCardValue className='text-xl sm:text-2xl md:text-[2.6rem]'>{formatNumber(stats.opened)}</KpiCardValue>
                                            </KpiCardContent>
                                        </KpiCard>
                                    }

                                    {emailTrackClicksEnabled &&
                                        <KpiCard className='relative grow p-3 md:p-6'>
                                            <KpiCardLabel>
                                                <div className='ml-0.5 size-[9px] rounded-full bg-chart-teal !text-sm opacity-50 lg:text-base'></div>
                                                {/* <LucideIcon.MousePointer strokeWidth={1.5} /> */}
                                        Clicked
                                            </KpiCardLabel>
                                            <KpiCardContent>
                                                <KpiCardValue className='text-xl sm:text-2xl md:text-[2.6rem]'>{formatNumber(stats.clicked)}</KpiCardValue>
                                            </KpiCardContent>
                                        </KpiCard>
                                    }
                                </div>
                                <div className={`$ mx-auto grid grid-cols-1 items-center justify-center gap-4 transition-all md:gap-0 ${chartHeaderClass === 'grid-cols-2' && 'md:grid-cols-2'} ${chartHeaderClass === 'grid-cols-3' && 'md:grid-cols-3'}`}>
                                    <div className={`relative border-r-0 px-6 ${(emailTrackOpensEnabled || emailTrackClicksEnabled) && 'md:border-r'}`}>
                                        <NewsletterRadialChart
                                            className={chartClass}
                                            config={sentChartConfig}
                                            data={sentChartData}
                                            percentageLabel='Sent'
                                            percentageValue={formatPercentage(1)}
                                            size={chartSize}
                                            tooltip={false}
                                        />
                                        {(emailTrackOpensEnabled || emailTrackClicksEnabled) &&
                                            <FunnelArrow />
                                        }
                                    </div>

                                    {emailTrackOpensEnabled &&
                                        <div className={`group/block relative border-r-0 px-6 transition-all hover:bg-muted/25 ${emailTrackClicksEnabled && 'md:border-r'}`}>
                                            <BlockTooltip
                                                avgValue={formatPercentage(averageStats.openedRate)}
                                                dataColor='hsl(var(--chart-blue))'
                                                value={formatPercentage(stats.openedRate)}
                                            />
                                            <NewsletterRadialChart
                                                className={chartClass}
                                                config={openedChartConfig}
                                                data={openedChartData}
                                                percentageLabel='Open rate'
                                                percentageValue={formatPercentage(stats.openedRate)}
                                                size={chartSize}
                                                tooltip={false}
                                            />
                                            {emailTrackClicksEnabled &&
                                                <FunnelArrow />
                                            }
                                        </div>
                                    }

                                    {emailTrackClicksEnabled &&
                                        <div className='group/block relative px-6 transition-all hover:bg-muted/25'>
                                            <BlockTooltip
                                                avgValue={formatPercentage(averageStats.clickedRate)}
                                                dataColor='hsl(var(--chart-teal))'
                                                value={formatPercentage(stats.clickedRate)}
                                            />
                                            <NewsletterRadialChart
                                                className={chartClass}
                                                config={clickedChartConfig}
                                                data={clickedChartData}
                                                percentageLabel='Click rate'
                                                percentageValue={formatPercentage(stats.clickedRate)}
                                                size={chartSize}
                                                tooltip={false}
                                            />
                                        </div>
                                    }
                                </div>
                            </CardContent>
                        }
                    </Card>

                    {shouldShowFeedback && <Feedback feedbackStats={feedbackStats} />}

                    {emailTrackClicksEnabled &&
                        <Card className='group/datalist overflow-hidden'>
                            <div className='flex items-center justify-between p-6'>
                                <CardHeader className='p-0'>
                                    <CardTitle>Newsletter clicks</CardTitle>
                                    <CardDescription>Which links resonated with your readers</CardDescription>
                                </CardHeader>
                                <HTable className='mr-2'>Members</HTable>
                            </div>
                            {isLoading ?
                                <CardContent className='p-6'>
                                    <Separator />
                                    <SkeletonTable />
                                </CardContent>
                                :
                                <CardContent className='pb-0'>
                                    <Separator />
                                    {topLinks.length > 0
                                        ?
                                        <DataList className="">
                                            <DataListBody>
                                                {paginatedTopLinks?.map((link) => {
                                                    const percentage = stats.clicked > 0 ? link.count / stats.clicked : 0;
                                                    const linkId = link.link.link_id;
                                                    const title = link.link.title;
                                                    const url = link.link.to;
                                                    const edited = link.link.edited;

                                                    return (
                                                        <DataListRow key={linkId}>
                                                            {editingLinkId !== linkId &&
                                                                <DataListBar style={{
                                                                    width: `${percentage ? Math.round(percentage * 100) : 0}%`
                                                                }} />
                                                            }
                                                            <DataListItemContent className='w-full'>
                                                                {editingLinkId === linkId ? (
                                                                    <div ref={containerRef} className='flex w-full items-center gap-2'>
                                                                        <Input
                                                                            ref={inputRef}
                                                                            className="z-50 h-7 w-full border-border bg-background text-sm"
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
                                                                            className='mr-2 shrink-0 bg-background'
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
                                                                            <span className='ml-1 text-gray-500'>(edited)</span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </DataListItemContent>
                                                            <DataListItemValue>
                                                                <DataListItemValueAbs>{formatNumber(link.count || 0)}</DataListItemValueAbs>
                                                                <DataListItemValuePerc>{formatPercentage(percentage)}</DataListItemValuePerc>
                                                            </DataListItemValue>
                                                        </DataListRow>
                                                    );
                                                })}
                                            </DataListBody>
                                        </DataList>
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
                                            <div className='mt-2 flex items-start gap-2 pl-4 text-sm text-green'>
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
                    }
                </div>
            </PostAnalyticsContent>
        </>
    );
};

export default Newsletter;
