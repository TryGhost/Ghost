import React from 'react';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Skeleton, formatDisplayDate, formatNumber, formatPercentage} from '@tryghost/shade';
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
        <Card className='group/card bg-gradient-to-tr from-muted/30 to-muted/0 to-50%'>
            <CardHeader>
                <CardTitle className='flex items-baseline justify-between leading-snug text-muted-foreground'>
                    Latest post performance
                </CardTitle>
                <CardDescription className='hidden'>How your last post did</CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-3 gap-8 px-0'>
                {latestPostStats ? (
                    <>
                        {isLoading ?
                            <div className='col-span-2 flex flex-col items-stretch px-6'>
                                <Skeleton className='aspect-video w-full rounded-md' />
                                <Skeleton className='mt-4' />
                            </div>
                            :
                            <>
                                <div className='col-span-2 flex items-stretch gap-6 px-6 transition-all'>
                                    {latestPostStats.feature_image &&
                                    <div className='aspect-[16/10] w-full max-w-[232px] rounded-sm bg-cover bg-center' style={{
                                        backgroundImage: `url(${latestPostStats.feature_image})`
                                    }}></div>
                                    }
                                    <div className='flex flex-col items-start justify-center'>
                                        <div className='text-[1.6rem] font-semibold leading-tighter hover:cursor-pointer hover:opacity-75' onClick={() => {
                                            if (!isLoading && latestPostStats) {
                                                navigate(`/posts/analytics/beta/${latestPostStats.id}`, {crossApp: true});
                                            }
                                        }}>{latestPostStats.title}</div>
                                        <div className='mt-1 text-sm text-muted-foreground'>Published {formatDisplayDate(latestPostStats.published_at)}</div>
                                        <div className='mt-3'>
                                            <Button
                                                variant='outline'
                                                onClick={() => {
                                                    navigate(`/posts/analytics/beta/${latestPostStats.id}`, {crossApp: true});
                                                }}
                                            >
                                                <LucideIcon.ChartNoAxesColumn /> Post analytics
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        }
                        <div className='flex flex-col items-stretch gap-2 pr-6 text-sm'>
                            {isLoading ?
                                <div className='grid grid-cols-2 gap-5 pl-6'>
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
                                    <div className='grid grid-cols-2 gap-x-6 border-l pl-6'>
                                        <div className='group mr-2 flex flex-col gap-1.5 hover:cursor-pointer' onClick={() => {
                                            navigate(`/posts/analytics/beta/${latestPostStats.id}/web`, {crossApp: true});
                                        }}>
                                            <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                <LucideIcon.Eye size={16} strokeWidth={1.25} />
                                                Visitors
                                            </div>
                                            <span className='text-[2.2rem] font-semibold leading-none tracking-tighter'>
                                                {formatNumber(latestPostStats.visitors)}
                                            </span>
                                        </div>
                                        <div className='group mr-2 flex flex-col gap-1.5 hover:cursor-pointer' onClick={() => {
                                            navigate(`/posts/analytics/beta/${latestPostStats.id}/growth`, {crossApp: true});
                                        }}>
                                            <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                <LucideIcon.UserPlus size={16} strokeWidth={1.25} />
                                                Members
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
                                        {latestPostStats.open_rate ?
                                            <>
                                                <div className='group mr-2 flex flex-col gap-1.5 pt-6 hover:cursor-pointer' onClick={() => {
                                                    navigate(`/posts/analytics/beta/${latestPostStats.id}/newsletter`, {crossApp: true});
                                                }}>
                                                    <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                        <LucideIcon.MailOpen size={16} strokeWidth={1.25} />
                                                Open rate
                                                    </div>
                                                    <span className='text-[2.2rem] font-semibold leading-none tracking-tighter'>
                                                        {formatPercentage(latestPostStats.open_rate / 100)}
                                                    </span>
                                                </div>
                                                <div className='group mr-2 flex flex-col gap-1.5 pt-6 hover:cursor-pointer' onClick={() => {
                                                    navigate(`/posts/analytics/beta/${latestPostStats.id}/newsletter`, {crossApp: true});
                                                }}>
                                                    <div className='flex items-center gap-1.5 font-medium text-muted-foreground transition-all group-hover:text-foreground'>
                                                        <LucideIcon.MousePointerClick size={16} strokeWidth={1.25} />
                                                Click rate
                                                    </div>
                                                    <span className='text-[2.2rem] font-semibold leading-none tracking-tighter'>
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
        </Card>
    );
};

export default LatestPost;
