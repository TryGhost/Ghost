import React, {useState} from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, LucideIcon, PostShareModal, Separator, Skeleton, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';

import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate} from '@tryghost/admin-x-framework';

// Import the interface from the hook
import {LatestPostWithStats} from '@src/hooks/useLatestPostStats';

interface LatestPostProps {
    latestPostStats: LatestPostWithStats | null;
    isLoading: boolean;
}

const LatestPost: React.FC<LatestPostProps> = ({
    latestPostStats,
    isLoading
}) => {
    const navigate = useNavigate();
    const [isShareOpen, setIsShareOpen] = useState(false);
    const {site, settings} = useGlobalData();
    
    // Get site title from settings or site data
    const siteTitle = site.title || String(settings.find(setting => setting.key === 'title')?.value || 'Ghost Site');

    return (
        <Card className='group/card bg-gradient-to-tr from-muted/30 to-muted/0 to-50%'>
            <CardHeader>
                <CardTitle className='flex items-baseline justify-between leading-snug text-muted-foreground'>
                    Latest post performance
                </CardTitle>
                <CardDescription className='hidden'>How your last post did</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col items-stretch gap-6'>
                {isLoading &&
                    <>
                        <div className='grid w-full grid-cols-3 items-center gap-3'>
                            <div>
                                <Skeleton className='aspect-video w-full rounded-md' />
                            </div>
                            <div className='col-span-2'>
                                <Skeleton className='w-full' />
                                <Skeleton className='w-1/2' />
                            </div>
                        </div>
                        <div className='flex flex-col items-stretch gap-2 text-sm'>
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
                {latestPostStats ? (
                    <>
                        <Separator />
                        <div className='-mt-2 flex items-stretch gap-4 transition-all hover:cursor-pointer hover:opacity-75' onClick={() => {
                            if (!isLoading && latestPostStats) {
                                navigate(`/posts/analytics/beta/${latestPostStats.id}`, {crossApp: true});
                            }
                        }}>
                            {latestPostStats.feature_image &&
                                    <div className='aspect-[16/10] max-h-[76px] w-full max-w-[100px] rounded-sm bg-cover bg-center' style={{
                                        backgroundImage: `url(${latestPostStats.feature_image})`
                                    }}></div>
                            }
                            <div className='flex flex-col justify-center'>
                                <div className='text-lg font-semibold leading-tighter tracking-tight'>{latestPostStats.title}</div>
                                <div className='mt-1 text-sm text-muted-foreground'>
                                    {latestPostStats.authors && latestPostStats.authors.length > 0 && (
                                        <span>By {latestPostStats.authors.map(author => author.name).join(', ')} • </span>
                                    )}
                                    Published {formatDisplayDate(latestPostStats.published_at)}
                                </div>
                            </div>
                        </div>
                        <div className='flex flex-col items-stretch gap-2 text-sm'>

                            <div className='grid grid-cols-[1fr_1px_1fr] gap-x-3'>
                                <div className='group mr-2 flex flex-col gap-1.5 hover:cursor-pointer' onClick={() => {
                                    navigate(`/posts/analytics/beta/${latestPostStats.id}/web`, {crossApp: true});
                                }}>
                                    <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                        <LucideIcon.MousePointer size={16} strokeWidth={1.25} />
                                                Visitors
                                    </div>
                                    <span className='text-[2.3rem] font-semibold leading-none tracking-tighter'>
                                        {formatNumber(latestPostStats.visitors)}
                                    </span>
                                </div>
                                <div className='h-full w-px bg-border'></div>
                                <div className='group mr-2 flex flex-col gap-1.5 hover:cursor-pointer' onClick={() => {
                                    navigate(`/posts/analytics/beta/${latestPostStats.id}/growth`, {crossApp: true});
                                }}>
                                    <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                        <LucideIcon.UserPlus size={16} strokeWidth={1.25} />
                                                Members
                                    </div>
                                    <span className='text-[2.3rem] font-semibold leading-none tracking-tighter'>
                                        {latestPostStats.member_delta ?
                                            <>
                                                        +{formatNumber(latestPostStats.member_delta)}
                                            </>
                                            :
                                            0}
                                    </span>
                                </div>
                                {latestPostStats.open_rate ?
                                    <>
                                        <div className='group mr-2 flex flex-col gap-1.5 pt-6 hover:cursor-pointer' onClick={() => {
                                            navigate(`/posts/analytics/beta/${latestPostStats.id}/newsletter`, {crossApp: true});
                                        }}>
                                            <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                <LucideIcon.MailOpen size={16} strokeWidth={1.25} />
                                                Open rate
                                            </div>
                                            <span className='text-[2.3rem] font-semibold leading-none tracking-tighter'>
                                                {formatPercentage(latestPostStats.open_rate / 100)}
                                            </span>
                                        </div>
                                        <div className='h-full w-px bg-border'></div>
                                        <div className='group mr-2 flex flex-col gap-1.5 pt-6 hover:cursor-pointer' onClick={() => {
                                            navigate(`/posts/analytics/beta/${latestPostStats.id}/newsletter`, {crossApp: true});
                                        }}>
                                            <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                <LucideIcon.MousePointerClick size={16} strokeWidth={1.25} />
                                                Click rate
                                            </div>
                                            <span className='text-[2.3rem] font-semibold leading-none tracking-tighter'>
                                                {formatPercentage(latestPostStats.click_rate || 0 / 100)}
                                            </span>
                                        </div>
                                    </>
                                    :
                                    <></>
                                }
                            </div>
                        </div>
                    </>)
                    : !isLoading &&
                    <div className='flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground'>
                        <LucideIcon.FileText size={32} strokeWidth={1.5} />
                        <div>No published posts yet</div>
                    </div>
                }
            </CardContent>
            {!isLoading && latestPostStats &&
                <CardFooter className='flex items-center justify-stretch gap-2'>
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
                        <Button className='w-full grow' onClick={() => setIsShareOpen(true)}><LucideIcon.Share /> Share</Button>
                    </PostShareModal>
                    <Button
                        variant='outline'
                        onClick={() => {
                            navigate(`/posts/analytics/beta/${latestPostStats.id}`, {crossApp: true});
                        }}
                    >
                        <LucideIcon.ChartNoAxesColumn />
                    </Button>
                </CardFooter>
            }
        </Card>
    );
};

export default LatestPost;
