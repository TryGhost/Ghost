import {Avatar, AvatarFallback, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, LucideIcon, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, Table, TableBody, TableCell, TableRow, Tabs, TabsList, TabsTrigger, formatPercentage, useSimplePagination} from '@tryghost/shade';
import {useParams} from '@tryghost/admin-x-framework';
import {usePostFeedback} from '@src/hooks/usePostFeedback';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';
import {useState} from 'react';

const Feedback: React.FC = () => {
    const {postId} = useParams();
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

    // Helper function to format member names with fallback to email
    const formatMemberName = (member: {name?: string; email?: string}) => {
        return member.name || member.email || 'Unknown Member';
    };

    // Helper function to get member initials
    const getMemberInitials = (member: {name?: string; email?: string}) => {
        const name = formatMemberName(member);
        const words = name.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Helper function to format timestamp
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        
        // Handle invalid dates
        if (isNaN(date.getTime())) {
            return 'Unknown';
        }
        
        // Both dates are now in the same timezone context (local)
        // The timestamp from DB is UTC but Date constructor handles the conversion
        const diffMs = now.getTime() - date.getTime();
        
        // Handle negative differences (future dates)
        if (diffMs < 0) {
            return 'Just now';
        }
        
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} min ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hr ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: diffDays > 365 ? 'numeric' : undefined
            });
        }
    };

    const isLoading = isStatsLoading || isFeedbackLoading;

    // Show loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader className='pb-3'>
                    <CardTitle>Feedback</CardTitle>
                    <CardDescription>What did your readers think?</CardDescription>
                </CardHeader>
                <CardContent className='text-muted-foreground flex grow flex-col items-center justify-center text-center text-sm'>
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
                        <Table>
                            <TableBody>
                                {paginatedFeedback.map(item => (
                                    <TableRow key={item.id} className='border-none'>
                                        <TableCell className='h-12 max-w-0 border-none'>
                                            <div className='flex items-center gap-2 font-medium'>
                                                <Avatar className='size-7'>
                                                    <AvatarFallback>{getMemberInitials(item.member)}</AvatarFallback>
                                                </Avatar>
                                                {formatMemberName(item.member)}
                                            </div>
                                        </TableCell>
                                        <TableCell className='text-muted-foreground w-[120px] text-right'>
                                            {formatTimestamp(item.created_at)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className='text-muted-foreground py-8 text-center text-sm'>
                            <div>No {activeFeedbackTab === 'positive' ? 'positive' : 'negative'} feedback yet</div>
                        </div>
                    )}
                </CardContent>
                :
                <CardContent className='text-muted-foreground flex grow flex-col items-center justify-center text-center text-sm'>
                    <div>No members have given feedback yet</div>
                    <div>When someone does, you&apos;ll see their response here.</div>
                </CardContent>
            }
            {feedbackStats.totalFeedback > 0 &&
                <CardFooter className='grow-0'>
                    <div className='flex w-full items-center justify-between gap-3'>
                        <Button size='sm' variant='outline'>
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
