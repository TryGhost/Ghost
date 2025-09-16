import React, {useState} from 'react';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyIndicator, LucideIcon, PostShareModal, Skeleton, cn, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';

import {Post, getPostMetricsToDisplay} from '@tryghost/admin-x-framework';
import {useAppContext, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

// Import the interface from the hook
import {LatestPostWithStats} from '@src/hooks/useLatestPostStats';

interface LatestPostProps {
    latestPostStats: LatestPostWithStats | null;
    isLoading: boolean;
}

const getPostStatusText = (latestPostStats: LatestPostWithStats) => {
    if (latestPostStats.email_only) {
        return 'Sent';
    } else if (latestPostStats.email) {
        return 'Published and sent';
    } else {
        return 'Published';
    }
};

const LatestPost: React.FC<LatestPostProps> = ({
    latestPostStats,
    isLoading
}) => {
    const navigate = useNavigate();
    const [isShareOpen, setIsShareOpen] = useState(false);
    const {site, settings} = useGlobalData();
    const {appSettings} = useAppContext();
    const {emailTrackClicks: emailTrackClicksEnabled, emailTrackOpens: emailTrackOpensEnabled} = appSettings?.analytics || {};

    // Get site title from settings or site data
    const siteTitle = site.title || String(settings.find(setting => setting.key === 'title')?.value || 'Ghost Site');

    // Calculate metrics to show outside of JSX
    const metricsToShow = latestPostStats ? getPostMetricsToDisplay(latestPostStats as Post, {
        membersTrackSources: appSettings?.analytics.membersTrackSources
    }) : null;

    const metricClassName = 'group mr-2 flex flex-col gap-1.5 hover:cursor-pointer';

    return (
        <Card className='group/card bg-gradient-to-tr from-muted/40 to-muted/0 to-50%' data-testid='latest-post'>
            <CardHeader>
                <CardTitle className='flex items-baseline justify-between font-medium leading-snug text-muted-foreground'>
                    Latest post performance
                </CardTitle>
                <CardDescription className='hidden'>How your last post did</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-8 px-0 lg:flex-row xl:grid xl:grid-cols-3'>
                {isLoading &&
                    <>
                        <div className='flex w-full items-center gap-6 px-6 xl:col-span-2'>
                            <div className='w-full max-w-[232px] grow'>
                                <Skeleton className='aspect-[16/10] rounded-md' />
                            </div>
                            <div className='w-full grow'>
                                <Skeleton className='w-full max-w-[420px]' />
                                <Skeleton className='w-1/2' />
                            </div>
                        </div>
                        <div className='flex flex-col items-stretch gap-2 px-6 text-sm'>
                            <div className='grid grid-cols-2 gap-5'>
                                <div>
                                    <Skeleton className='w-3/4' />
                                    <Skeleton className='h-10 w-1/3' />
                                </div>
                                <div>
                                    <Skeleton className='w-3/4' />
                                    <Skeleton className='h-10 w-1/3' />
                                </div>
                                <div>
                                    <Skeleton className='w-3/4' />
                                    <Skeleton className='h-10 w-1/3' />
                                </div>
                                <div>
                                    <Skeleton className='w-3/4' />
                                    <Skeleton className='h-10 w-1/3' />
                                </div>
                            </div>
                        </div>
                    </>
                }
                {!isLoading && latestPostStats && metricsToShow ? (
                    <>
                        <div className='flex flex-col gap-6 px-6 transition-all md:flex-row md:items-start xl:col-span-2'>
                            {latestPostStats.feature_image &&
                                    <div className='aspect-[16/10] w-full min-w-[100px] rounded-sm bg-cover bg-center sm:max-w-[170px] lg:max-w-[170px] xl:max-w-[232px]' style={{
                                        backgroundImage: `url(${latestPostStats.feature_image})`
                                    }}></div>
                            }
                            <div className='flex grow flex-col items-start justify-center self-stretch'>
                                <div className='text-lg font-semibold leading-tighter tracking-tight hover:cursor-pointer hover:opacity-75' onClick={() => {
                                    if (!isLoading && latestPostStats) {
                                        navigate(`/posts/analytics/${latestPostStats.id}`, {crossApp: true});
                                    }
                                }}>
                                    {latestPostStats.title}
                                </div>
                                <div className='mt-0.5 text-sm text-muted-foreground'>
                                    {latestPostStats.authors && latestPostStats.authors.length > 0 && (
                                        <div>
                                            By {latestPostStats.authors.map(author => author.name).join(', ')} &ndash; {formatDisplayDate(latestPostStats.published_at)}
                                        </div>
                                    )}
                                    <div className='mt-0.5'>
                                        {getPostStatusText(latestPostStats)}
                                    </div>
                                </div>
                                <div className='mt-6 flex items-center gap-2'>
                                    {!latestPostStats.email_only && (
                                        <PostShareModal
                                            author={latestPostStats.authors?.map(author => author.name).join(', ') || ''}
                                            description=''
                                            faviconURL={site.icon || ''}
                                            featureImageURL={latestPostStats.feature_image || ''}
                                            open={isShareOpen}
                                            postExcerpt={latestPostStats.excerpt || ''}
                                            postTitle={latestPostStats.title}
                                            postURL={latestPostStats.url || ''}
                                            siteTitle={siteTitle}
                                            onClose={() => setIsShareOpen(false)}
                                            onOpenChange={setIsShareOpen}
                                        >
                                            <Button onClick={() => setIsShareOpen(true)}><LucideIcon.Share /> Share post</Button>
                                        </PostShareModal>
                                    )}
                                    <Button
                                        className={latestPostStats.email_only ? 'w-full' : ''}
                                        variant='outline'
                                        onClick={() => {
                                            navigate(`/posts/analytics/${latestPostStats.id}`, {crossApp: true});
                                        }}
                                    >
                                        <LucideIcon.ChartNoAxesColumn />
                                        <span className='hidden md:!visible md:!block'>
                                            {!latestPostStats.email_only ? 'Analytics' : 'Post analytics' }
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className='-ml-4 flex w-full flex-col items-stretch gap-2 pr-6 text-sm xl:h-full xl:max-w-none'>
                            <div className='grid grid-cols-2 gap-6 pl-10 lg:border-l xl:h-full'>
                                {/* Web metrics - only for published posts */}
                                {metricsToShow.showWebMetrics && appSettings?.analytics.webAnalytics &&
                                    <div className={metricClassName} data-testid='latest-post-visitors' onClick={() => {
                                        navigate(`/posts/analytics/${latestPostStats.id}/web`, {crossApp: true});
                                    }}>
                                        <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                            <LucideIcon.Globe size={16} strokeWidth={1.25} />
                                            <span className='hidden md:!visible md:!block'>
                                                Visitors
                                            </span>
                                        </div>
                                        <span className='text-[2.2rem] font-semibold leading-none tracking-tighter'>
                                            {formatNumber(latestPostStats.visitors)}
                                        </span>
                                    </div>
                                }

                                {/* Member growth - show if available and member tracking is enabled */}
                                {metricsToShow.showMemberGrowth &&
                                    <div className={
                                        cn(
                                            metricClassName,

                                            // Member metric is moved to the 2nd row in the grid if the post is email only or if web analytics is turned off, otherwise leave as is
                                            (metricsToShow.showEmailMetrics && (!metricsToShow.showWebMetrics || !appSettings?.analytics.webAnalytics)) && 'row-[2/3] col-[1/2]'
                                        )
                                    } data-testid='latest-post-members' onClick={() => {
                                        navigate(`/posts/analytics/${latestPostStats.id}/growth`, {crossApp: true});
                                    }}>
                                        <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                            <LucideIcon.UserPlus size={16} strokeWidth={1.25} />
                                            <span className='hidden md:!visible md:!block'>Members</span>
                                        </div>
                                        <span className='text-[2.2rem] font-semibold leading-none tracking-tighter'>
                                            {latestPostStats.member_delta ?
                                                <>
                                                    +{formatNumber(latestPostStats.member_delta)}
                                                </>
                                                :
                                                0}
                                        </span>
                                    </div>
                                }

                                {/* Email metrics - show for email posts */}
                                {metricsToShow.showEmailMetrics && latestPostStats.email && (
                                    <>
                                        {emailTrackOpensEnabled && (
                                            <div className={metricClassName} onClick={() => {
                                                navigate(`/posts/analytics/${latestPostStats.id}/newsletter`, {crossApp: true});
                                            }}>
                                                <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                    <LucideIcon.MailOpen size={16} strokeWidth={1.25} />
                                                    <span className='hidden whitespace-nowrap md:!visible md:!block'>Opens</span>
                                                </div>
                                                <span className='text-[2.2rem] font-semibold leading-none tracking-tighter'>
                                                    {latestPostStats.email.email_count ?
                                                        formatPercentage((latestPostStats.email.opened_count || 0) / latestPostStats.email.email_count)
                                                        : '0%'
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        {emailTrackClicksEnabled && (
                                            <div className={metricClassName} onClick={() => {
                                                navigate(`/posts/analytics/${latestPostStats.id}/newsletter`, {crossApp: true});
                                            }}>
                                                <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                    <LucideIcon.MousePointerClick size={16} strokeWidth={1.25} />
                                                    <span className='hidden whitespace-nowrap md:!visible md:!block'>Clicks</span>
                                                </div>
                                                <span className='text-[2.2rem] font-semibold leading-none tracking-tighter'>
                                                    {latestPostStats.email.email_count && latestPostStats.count?.clicks ?
                                                        formatPercentage((latestPostStats.count.clicks || 0) / latestPostStats.email.email_count)
                                                        : '0%'
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : !isLoading && (

                    <EmptyIndicator
                        actions={<Button variant='secondary' onClick={() => {
                            navigate('/editor/post', {crossApp: true});
                        }}>
                            New post
                        </Button>}
                        className='w-full pb-10 xl:col-span-3'
                        description={`Once it's live, you can track performance here`}
                        title='Publish your first post'
                    >
                        <LucideIcon.FileText strokeWidth={1.5} />
                    </EmptyIndicator>
                )}
            </CardContent>
        </Card>
    );
};

export default LatestPost;
