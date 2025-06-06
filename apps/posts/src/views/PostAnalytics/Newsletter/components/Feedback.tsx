import {Avatar, AvatarFallback, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, LucideIcon, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, Table, TableBody, TableCell, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, formatPercentage, useSimplePagination} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useState} from 'react';

interface FeedbackMember {
    id: string;
    uuid: string;
    name?: string;
    email?: string;
    feedbackId: string;
    timestamp: string;
    score: number;
}

interface FeedbackStats {
    positiveFeedback: number;
    negativeFeedback: number;
    totalFeedback: number;
}

interface FeedbackMembers {
    positive: FeedbackMember[];
    negative: FeedbackMember[];
    all: FeedbackMember[];
}

interface FeedbackProps {
    feedbackStats: FeedbackStats;
    feedbackMembers: FeedbackMembers;
}

const Feedback: React.FC<FeedbackProps> = ({feedbackStats, feedbackMembers}) => {
    const navigate = useNavigate();
    const [activeFeedbackTab, setActiveFeedbackTab] = useState('more-like-this');
    const ITEMS_PER_PAGE = 5;

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

    // Pagination for positive feedback members
    const {
        totalPages: positiveFeedbackTotalPages,
        paginatedData: paginatedPositiveFeedback,
        nextPage: positiveFeedbackNextPage,
        previousPage: positiveFeedbackPreviousPage,
        hasNextPage: positiveFeedbackHasNextPage,
        hasPreviousPage: positiveFeedbackHasPreviousPage
    } = useSimplePagination({
        data: feedbackMembers.positive,
        itemsPerPage: ITEMS_PER_PAGE
    });

    // Pagination for negative feedback members
    const {
        totalPages: negativeFeedbackTotalPages,
        paginatedData: paginatedNegativeFeedback,
        nextPage: negativeFeedbackNextPage,
        previousPage: negativeFeedbackPreviousPage,
        hasNextPage: negativeFeedbackHasNextPage,
        hasPreviousPage: negativeFeedbackHasPreviousPage
    } = useSimplePagination({
        data: feedbackMembers.negative,
        itemsPerPage: ITEMS_PER_PAGE
    });

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
                        <TabsContent value="more-like-this">
                            <Table>
                                <TableBody>
                                    {paginatedPositiveFeedback?.map(member => (
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
                        </TabsContent>
                        <TabsContent value="less-like-this">
                            <Table>
                                <TableBody>
                                    {paginatedNegativeFeedback?.map(member => (
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
                        </TabsContent>
                    </Tabs>
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
                        {((activeFeedbackTab === 'more-like-this' && positiveFeedbackTotalPages > 1) ||
                            (activeFeedbackTab === 'less-like-this' && negativeFeedbackTotalPages > 1)) &&
                            <SimplePagination className='pb-0'>
                                <SimplePaginationNavigation>
                                    <SimplePaginationPreviousButton
                                        disabled={activeFeedbackTab === 'more-like-this'
                                            ? !positiveFeedbackHasPreviousPage
                                            : !negativeFeedbackHasPreviousPage}
                                        onClick={activeFeedbackTab === 'more-like-this'
                                            ? positiveFeedbackPreviousPage
                                            : negativeFeedbackPreviousPage}
                                    />
                                    <SimplePaginationNextButton
                                        disabled={activeFeedbackTab === 'more-like-this'
                                            ? !positiveFeedbackHasNextPage
                                            : !negativeFeedbackHasNextPage}
                                        onClick={activeFeedbackTab === 'more-like-this'
                                            ? positiveFeedbackNextPage
                                            : negativeFeedbackNextPage}
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
