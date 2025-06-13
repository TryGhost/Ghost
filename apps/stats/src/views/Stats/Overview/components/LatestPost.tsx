import React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, LucideIcon, Separator, Skeleton, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
import {LatestPostStats} from '@tryghost/admin-x-framework/api/stats';
import {useNavigate} from '@tryghost/admin-x-framework';

interface LatestPostProps {
    latestPostStats: LatestPostStats | null;
    isLoading: boolean;
}

const LatestPost: React.FC<LatestPostProps> = ({
    latestPostStats,
    isLoading
}) => {
    const navigate = useNavigate();

    return (
        <Card className='group/card'>
            <CardHeader>
                <CardTitle className='flex items-baseline justify-between leading-snug'>
                    Latest post performance
                    {/* {latestPostStats && (
                        <Button
                            className='-translate-x-2 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100'
                            variant='outline'
                        >
                            Details
                            <LucideIcon.ArrowRight size={16} strokeWidth={1.5} />
                        </Button>
                    )} */}
                </CardTitle>
                <CardDescription className='hidden'>How your last post did</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col items-stretch gap-6'>
                {latestPostStats ? (
                    <>
                        {isLoading ?
                            <div className='flex flex-col items-stretch'>
                                <Skeleton className='aspect-video w-full rounded-md' />
                                <Skeleton className='mt-4' />
                            </div>
                            :
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
                                        <div className='mt-1 text-sm text-muted-foreground'>Published {formatDisplayDate(latestPostStats.published_at)}</div>
                                    </div>
                                </div>
                            </>
                        }
                        <div className='flex flex-col items-stretch gap-2 text-sm'>
                            {isLoading ?
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
                                :
                                <>
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
                                </>
                            }
                        </div>
                    </>
                ) :
                    !isLoading &&
                    <div className='flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground'>
                        <LucideIcon.FileText size={32} strokeWidth={1.5} />
                        <div>No published posts yet</div>
                    </div>
                }
            </CardContent>
            {!isLoading && latestPostStats &&
                <CardFooter>
                    <Button
                        className='w-full'
                        variant='outline'
                        onClick={() => {
                            navigate(`/posts/analytics/beta/${latestPostStats.id}`, {crossApp: true});
                        }}
                    >
                        <LucideIcon.ChartNoAxesColumn /> Post analytics
                    </Button>
                </CardFooter>
            }
        </Card>
    );
};

export default LatestPost;
