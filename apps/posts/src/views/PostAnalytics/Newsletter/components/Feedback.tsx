import {Avatar, AvatarFallback, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, HTable, LucideIcon, Separator, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, SkeletonTable, Tabs, TabsList, TabsTrigger, formatMemberName, formatPercentage, formatTimestamp, getMemberInitials, stringToHslColor, useSimplePagination} from '@tryghost/shade';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {usePostFeedback} from '@src/hooks/usePostFeedback';
import {useState} from 'react';

interface FeedbackProps {
    feedbackStats: {
        positiveFeedback: number;
        negativeFeedback: number;
        totalFeedback: number;
    };
}

const Feedback: React.FC<FeedbackProps> = ({feedbackStats}) => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const [activeFeedbackTab, setActiveFeedbackTab] = useState<'positive' | 'negative'>('positive');
    const ITEMS_PER_PAGE = 9;

    // Get detailed feedback data for the active tab (all data, not limited)
    const score = activeFeedbackTab === 'positive' ? 1 : 0;
    const {feedback, isLoading: isFeedbackLoading} = usePostFeedback(postId || '', score);

    // Pagination for feedback
    const {
        totalPages,
        paginatedData: paginatedFeedback,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage
    } = useSimplePagination({
        data: feedback,
        itemsPerPage: ITEMS_PER_PAGE
    });

    const isLoading = isFeedbackLoading;

    return (
        <Card>
            <CardHeader className='pb-5'>
                <CardTitle>Feedback</CardTitle>
                <CardDescription>What did your readers think?</CardDescription>
            </CardHeader>
            {feedbackStats.totalFeedback > 0 ?
                <CardContent className='pb-3'>
                    <div className='flex items-center justify-between gap-3'>
                        <Tabs className='pb-3' defaultValue="positive" value={activeFeedbackTab} variant='button' onValueChange={value => setActiveFeedbackTab(value as 'positive' | 'negative')}>
                            <TabsList className='gap-1'>
                                <TabsTrigger className='h-7' value="positive">
                                    <div className='flex items-center gap-1 text-xs'>
                                        <LucideIcon.ThumbsUp size={14} strokeWidth={1.25} />
                                        <span className='hidden font-medium sm:!visible sm:!inline'>More like this</span>
                                        <span className='font-semibold tracking-tight'>{formatPercentage(feedbackStats.positiveFeedback / feedbackStats.totalFeedback)}</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger className='h-7' value="negative">
                                    <div className='flex items-center gap-1 text-xs'>
                                        <LucideIcon.ThumbsDown size={14} strokeWidth={1.25} />
                                        <span className='hidden font-medium sm:!visible sm:!inline'>Less like this</span>
                                        <span className='font-semibold tracking-tight'>{formatPercentage(feedbackStats.negativeFeedback / feedbackStats.totalFeedback)}</span>
                                    </div>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <HTable className='mb-3 mr-2 lg:hidden xl:!visible xl:!block'>Date</HTable>
                    </div>
                    <Separator />
                    {isLoading ?
                        <SkeletonTable className='mt-3' lines={3} />
                        :
                        paginatedFeedback && paginatedFeedback.length > 0 ? (
                            <div className='flex w-full flex-col py-3'>
                                {paginatedFeedback.map(item => (
                                    <div key={item.id} className='flex h-10 w-full items-center justify-between gap-3 rounded-sm border-none px-2 text-sm hover:cursor-pointer hover:bg-accent' onClick={() => {
                                        navigate(`/members/${item.member.id}`, {crossApp: true});
                                    }}>
                                        <div className='flex items-center gap-2 font-medium'>
                                            <Avatar className='size-7'>
                                                {item.member?.avatar_image && <img className='absolute aspect-square size-full' src={item.member?.avatar_image} />}
                                                <AvatarFallback className='text-white' style={{
                                                    backgroundColor: `${stringToHslColor(formatMemberName(item.member), 75, 55)}`
                                                }}>{getMemberInitials(item.member)}</AvatarFallback>
                                            </Avatar>
                                            {formatMemberName(item.member)}
                                        </div>
                                        <div className='whitespace-nowrap text-muted-foreground'>
                                            {formatTimestamp(item.created_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='flex h-full items-center justify-center py-8 text-center text-sm text-muted-foreground'>
                                <div>No {activeFeedbackTab === 'positive' ? 'positive' : 'negative'} feedback yet</div>
                            </div>
                        )
                    }
                </CardContent>
                :
                <CardContent className='flex grow flex-col items-center justify-center text-center text-sm text-muted-foreground'>
                    <div>No members have given feedback yet</div>
                    <div>When someone does, you&apos;ll see their response here.</div>
                </CardContent>
            }
            {feedbackStats.totalFeedback > 0 &&
                <CardFooter className='grow-0'>
                    <div className='flex w-full items-center justify-between gap-3'>
                        <Button variant='outline' onClick={() => {
                            const positiveFilter = `(feedback.post_id:'${postId}'+feedback.score:1)`;
                            const negativeFilter = `(feedback.post_id:'${postId}'+feedback.score:0)`;
                            const positiveFilterParam = `${encodeURIComponent(positiveFilter)}&post=${postId}`;
                            const negativeFilterParam = `${encodeURIComponent(negativeFilter)}&post=${postId}`;

                            navigate(`/members?filter=${activeFeedbackTab === 'positive' ? positiveFilterParam : negativeFilterParam}`, {crossApp: true});
                        }}>
                            View all
                            <LucideIcon.TableOfContents />
                        </Button>
                        {totalPages > 1 && (
                            <SimplePagination className='pb-0'>
                                <SimplePaginationNavigation>
                                    <SimplePaginationPreviousButton
                                        disabled={!hasPreviousPage}
                                        onClick={previousPage}
                                    />
                                    <SimplePaginationNextButton
                                        disabled={!hasNextPage}
                                        onClick={nextPage}
                                    />
                                </SimplePaginationNavigation>
                            </SimplePagination>
                        )}
                    </div>
                </CardFooter>
            }
        </Card>
    );
};

export default Feedback;
