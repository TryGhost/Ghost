import {Avatar, AvatarFallback, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, LucideIcon, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, Table, TableBody, TableCell, TableRow, Tabs, TabsList, TabsTrigger, formatPercentage, useSimplePagination} from '@tryghost/shade';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';
import {useState} from 'react';

const Feedback: React.FC = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const [activeFeedbackTab, setActiveFeedbackTab] = useState('more-like-this');
    const ITEMS_PER_PAGE = 5;

    // Get feedback data from the main hook
    const {feedbackStats, feedbackMembers, isLoading} = usePostNewsletterStats(postId || '');

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
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 30) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: diffDays > 365 ? 'numeric' : undefined
            });
        }
    };

    // Generate avatar background colors consistently
    const getAvatarClass = (memberId: string) => {
        const colors = [
            'bg-orange-500 text-white',
            'bg-pink-500 text-white',
            'bg-blue-500 text-white',
            'bg-green-500 text-white',
            'bg-purple-500 text-white',
            'bg-gray-800 text-white'
        ];
        const hash = memberId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    };

    // Get current feedback data based on active tab
    const currentFeedbackData = activeFeedbackTab === 'more-like-this'
        ? feedbackMembers.positive
        : feedbackMembers.negative;

    // Single pagination for current feedback data
    const {
        totalPages,
        paginatedData: paginatedFeedbackData,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage
    } = useSimplePagination({
        data: currentFeedbackData,
        itemsPerPage: ITEMS_PER_PAGE
    });

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
                    <Tabs defaultValue="more-like-this" value={activeFeedbackTab} variant='underline' onValueChange={setActiveFeedbackTab}>
                        <TabsList className="flex w-full">
                            <TabsTrigger className='h-12 justify-start px-3' value="more-like-this">
                                <div className='flex items-center gap-1.5'>
                                    <LucideIcon.ThumbsUp />
                                    <span className='font-semibold tracking-tight'>{formatPercentage(feedbackStats.positiveFeedback / feedbackStats.totalFeedback)}</span>
                                    <span className='text-sm font-medium'>More like this</span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger className='h-12 justify-start px-3' value="less-like-this">
                                <div className='flex items-center gap-1.5'>
                                    <LucideIcon.ThumbsDown />
                                    <span className='font-semibold tracking-tight'>{formatPercentage(feedbackStats.negativeFeedback / feedbackStats.totalFeedback)}</span>
                                    <span className='text-sm font-medium'>Less like this</span>
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Table>
                        <TableBody>
                            {paginatedFeedbackData?.map(member => (
                                <TableRow key={`${member.id}`} className='border-none hover:cursor-pointer' onClick={() => {
                                    navigate(`/members/${member.id}`, {crossApp: true});
                                }}>
                                    <TableCell className='h-12 max-w-0 border-none'>
                                        <div className='flex items-center gap-2 font-medium'>
                                            <Avatar className='size-7'>
                                                <AvatarFallback className={getAvatarClass(member.email || '')}>{getMemberInitials(member)}</AvatarFallback>
                                            </Avatar>
                                            {formatMemberName(member)}
                                        </div>
                                    </TableCell>
                                    <TableCell className='text-muted-foreground w-[120px] text-right'>{formatTimestamp(member.timestamp)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                        {totalPages > 1 &&
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
                        }
                    </div>
                </CardFooter>
            }
        </Card>
    );
};

export default Feedback;
