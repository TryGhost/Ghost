import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, LucideIcon, Separator, formatDisplayDate, formatNumber} from '@tryghost/shade';
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

    if (isLoading) {
        return (
            <div>Loading...</div>
        );
    }

    return (
        <Card className={`group/card ${latestPostStats && 'transition-all hover:cursor-pointer hover:bg-accent/50'}`} onClick={() => {
            if (latestPostStats) {
                navigate(`/posts/analytics/beta/${latestPostStats.id}`, {crossApp: true});
            }
        }}>
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
                        <div className='flex flex-col items-stretch'>
                            {latestPostStats.feature_image ?
                                <div className='aspect-video w-full rounded-md bg-cover bg-center' style={{
                                    backgroundImage: `url(${latestPostStats.feature_image})`
                                }}></div>
                                :
                                <Separator />
                            }
                            <div className='mt-4 text-xl font-semibold leading-tight tracking-tight'>{latestPostStats.title}</div>
                            <div className='mt-0.5 text-sm text-muted-foreground'>Published {formatDisplayDate(latestPostStats.published_at)} {new Date(latestPostStats.published_at).toLocaleDateString()}</div>
                        </div>
                        <div className='flex flex-col items-stretch gap-2 text-sm'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                    <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                    Visitors
                                </div>
                                <div className='font-mono'>{formatNumber(latestPostStats.visitors)}</div>
                            </div>
                            {latestPostStats.open_rate &&
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                    <LucideIcon.MailOpen size={16} strokeWidth={1.5} />
                                    Open rate
                                </div>
                                <div className='font-mono'>{`${Math.round(latestPostStats.open_rate)}%`}</div>
                            </div>
                            }
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                    <LucideIcon.User size={16} strokeWidth={1.5} />
                                    Members
                                </div>
                                <div className='font-mono'>{latestPostStats.member_delta > 0 ? `+${latestPostStats.member_delta}` : latestPostStats.member_delta}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className='flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground'>
                        <LucideIcon.FileText size={32} strokeWidth={1.5} />
                        <div>No published posts yet</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default LatestPost;
