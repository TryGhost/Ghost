import {Avatar, AvatarFallback, AvatarImage, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, LucideIcon, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, Tabs, TabsList, TabsTrigger, formatMemberName, formatPercentage, formatTimestamp, getMemberInitials, stringToHslColor, useSimplePagination} from '@tryghost/shade';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {usePostFeedback} from '@src/hooks/usePostFeedback';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';
import {useState} from 'react';

const Feedback: React.FC = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const [activeFeedbackTab, setActiveFeedbackTab] = useState<'positive' | 'negative'>('positive');
    const ITEMS_PER_PAGE = 5;

    // Get feedback data from the main hook for counts
    const {feedbackStats, isLoading: isStatsLoading} = usePostNewsletterStats(postId || '');

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

    const isLoading = isStatsLoading || isFeedbackLoading;

    // Show loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader className='pb-3'>
                    <CardTitle>Feedback</CardTitle>
                    <CardDescription>What did your readers think?</CardDescription>
                </CardHeader>
                <CardContent className='flex grow flex-col items-center justify-center text-center text-sm text-muted-foreground'>
                    <div>Loading feedback...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className='pb-3'>
                <CardTitle>Feedback</CardTitle>
                <CardDescription>What did your readers think?</CardDescription>
            </CardHeader>
            {feedbackStats.totalFeedback > 0 ?
                <CardContent className='pb-3'>
                    <Tabs defaultValue="positive" value={activeFeedbackTab} variant='underline' onValueChange={value => setActiveFeedbackTab(value as 'positive' | 'negative')}>
                        <TabsList className="flex w-full">
                            <TabsTrigger className='h-12 justify-start px-3' value="positive">
                                <div className='flex items-center gap-1.5'>
                                    <LucideIcon.ThumbsUp />
                                    <span className='font-semibold tracking-tight'>{formatPercentage(feedbackStats.positiveFeedback / feedbackStats.totalFeedback)}</span>
                                    <span className='text-sm font-medium'>More like this</span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger className='h-12 justify-start px-3' value="negative">
                                <div className='flex items-center gap-1.5'>
                                    <LucideIcon.ThumbsDown />
                                    <span className='font-semibold tracking-tight'>{formatPercentage(feedbackStats.negativeFeedback / feedbackStats.totalFeedback)}</span>
                                    <span className='text-sm font-medium'>Less like this</span>
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {paginatedFeedback && paginatedFeedback.length > 0 ? (
                        <div className='flex w-full flex-col py-3'>
                            {paginatedFeedback.map(item => (
                                <div key={item.id} className='flex h-10 w-full items-center justify-between gap-3 rounded-sm border-none px-2 text-sm hover:cursor-pointer hover:bg-accent' onClick={() => {
                                    navigate(`/members/${item.member.id}`, {crossApp: true});
                                }}>
                                    <div className='flex items-center gap-2 font-medium'>
                                        <Avatar className='size-7'>
                                            <AvatarImage src={item.member?.avatar_image}></AvatarImage>
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
                        <div className='py-8 text-center text-sm text-muted-foreground'>
                            <div>No {activeFeedbackTab === 'positive' ? 'positive' : 'negative'} feedback yet</div>
                        </div>
                    )}
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
                        <Button size='sm' variant='outline' onClick={() => {
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
