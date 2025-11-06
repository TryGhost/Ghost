import FeedItem from '@src/components/feed/FeedItem';
import Layout from '@src/components/layout';
import Reader from './Reader';
import TopicFilter, {Topic} from '@src/components/TopicFilter';
import {Activity} from '@src/api/activitypub';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, EmptyIndicator, LoadingIndicator, LucideIcon, Separator} from '@tryghost/shade';
import {isPendingActivity} from '@src/utils/pending-activity';
import {useEffect, useRef, useState} from 'react';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';
import {useNavigationStack, useParams} from '@tryghost/admin-x-framework';

export type InboxListProps = {
    isLoading: boolean,
    activities: Activity[],
    currentTopic: Topic,
    fetchNextPage: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean,
    onTopicChange: (topic: Topic) => void
}

const InboxList:React.FC<InboxListProps> = ({
    isLoading,
    activities,
    currentTopic,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    onTopicChange
}) => {
    const navigate = useNavigateWithBasePath();
    const {canGoBack, goBack} = useNavigationStack();
    const [isReaderOpen, setIsReaderOpen] = useState(false);
    const params = useParams();

    useEffect(() => {
        setIsReaderOpen(!!params.postId);
    }, [params.postId]);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const endLoadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        if (endLoadMoreRef.current) {
            observerRef.current.observe(endLoadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Calculate the index at which to place the loadMoreRef - This will place it ~75% through the list
    const loadMoreIndex = Math.max(0, Math.floor(activities.length * 0.75) - 1);

    return (
        <Layout>
            <TopicFilter currentTopic={currentTopic} onTopicChange={onTopicChange} />
            <div className='flex w-full flex-col'>
                <div className='w-full'>
                    {activities.length > 0 ? (
                        <div className='my-4'>
                            <div className='mx-auto flex min-h-[calc(100dvh_-_117px)] items-start gap-11'>
                                <div className='flex w-full min-w-0 flex-col items-center'>
                                    <div className='flex w-full min-w-0 flex-col items-start'>
                                        <ul className='mx-auto flex w-full flex-col' data-testid='inbox-list'>
                                            {activities.map((activity, index) => (
                                                <li
                                                // eslint-disable-next-line react/no-array-index-key
                                                    key={`${activity.id}-${activity.type}-${index}`} // We are using index here as activity.id is cannot be guaranteed to be unique at the moment
                                                    data-testid='inbox-item'
                                                    data-test-view-article
                                                >
                                                    <FeedItem
                                                        actor={activity.actor}
                                                        allowDelete={activity.object.authored}
                                                        commentCount={activity.object.replyCount ?? 0}
                                                        isLoading={isLoading}
                                                        isPending={isPendingActivity(activity.id)}
                                                        layout={'inbox'}
                                                        likeCount={activity.object.likeCount ?? 0}
                                                        object={activity.object}
                                                        repostCount={activity.object.repostCount ?? 0}
                                                        type={activity.type}
                                                        onClick={() => {
                                                            navigate(`/reader/${encodeURIComponent(activity.id)}`);
                                                        }}
                                                    />
                                                    {index < activities.length - 1 && (
                                                        <Separator />
                                                    )}
                                                    {index === loadMoreIndex && (
                                                        <div ref={loadMoreRef} className='h-1'></div>
                                                    )}
                                                </li>
                                            ))}
                                            {isFetchingNextPage && (
                                                <li className='flex flex-col items-center justify-center space-y-4 text-center'>
                                                    <LoadingIndicator size='md' />
                                                </li>
                                            )}
                                        </ul>
                                        <div ref={endLoadMoreRef} className='h-1'></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : currentTopic !== 'following' ? (
                        <div className='mt-[24vh]'>
                            <EmptyIndicator
                                description="Explore other topics for more content."
                                title="Nothing here yet"
                            >
                                <LucideIcon.Inbox />
                            </EmptyIndicator>
                        </div>
                    ) : (
                        <div className='mt-[24vh]'>
                            <EmptyIndicator
                                actions={
                                    <Button onClick={() => navigate('/explore')}>
                                        Find accounts to follow &rarr;
                                    </Button>
                                }
                                description="Start following publishers to see their long-form posts here."
                                title="Your Reader is empty"
                            >
                                <LucideIcon.Inbox />
                            </EmptyIndicator>
                        </div>
                    )}
                </div>
            </div>
            <Dialog
                open={isReaderOpen}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        if (canGoBack) {
                            goBack();
                        } else {
                            navigate('/reader');
                        }
                    }
                    setIsReaderOpen(open);
                }}
            >
                <DialogContent className='inset-y-3 h-[calc(100vh-24px)] w-screen max-w-[calc(100vw-24px)] !animate-none p-0 focus:outline-none dark:bg-gray-950'>
                    <DialogHeader className='hidden'>
                        <DialogTitle>Reader</DialogTitle>
                        <DialogDescription>Ghost reader for long form articles</DialogDescription>
                    </DialogHeader>
                    {params.postId && <Reader postId={params.postId} onClose={() => {
                        if (canGoBack) {
                            goBack();
                        } else {
                            navigate('/reader');
                        }
                    }} />}
                </DialogContent>
            </Dialog>
        </Layout>
    );
};

export default InboxList;
