import FeedItem from '@components/feed/FeedItem';
import Layout from '@components/layout';
import React, {useEffect, useRef, useState} from 'react';
import Reader from './Reader';
import Separator from '@components/global/Separator';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, LucideIcon} from '@tryghost/shade';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {LoadingIndicator} from '@tryghost/admin-x-design-system';
import {Navigate, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {isPendingActivity} from '@utils/pending-activity';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useInboxForUser} from '@hooks/use-activity-pub-queries';

const LongformInbox: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams();
    const [isReaderOpen, setIsReaderOpen] = useState(false);

    const {inboxQuery} = useInboxForUser({enabled: true});
    const feedQueryData = inboxQuery;
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

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

    useEffect(() => {
        setIsReaderOpen(!!params.postId);
    }, [params.postId]);

    // Calculate the index at which to place the loadMoreRef - This will place it ~75% through the list
    const loadMoreIndex = Math.max(0, Math.floor(activities.length * 0.75) - 1);

    const {isEnabled} = useFeatureFlags();
    if (!isEnabled('reader-routes')) {
        return <Navigate to='/inbox' />;
    }

    return (
        <Layout>
            <div className='flex w-full flex-col'>
                <div className='w-full'>
                    {activities.length > 0 ? (
                        <div className='my-4'>
                            <div className='mx-auto flex min-h-[calc(100dvh_-_117px)] items-start gap-11'>
                                <div className='flex w-full min-w-0 flex-col items-center'>
                                    <div className='flex w-full min-w-0 flex-col items-start'>
                                        <ul className='mx-auto flex w-full flex-col'>
                                            {activities.map((activity, index) => (
                                                <li
                                                    // eslint-disable-next-line react/no-array-index-key
                                                    key={`${activity.id}-${activity.type}-${index}`} // We are using index here as activity.id is cannot be guaranteed to be unique at the moment
                                                    data-test-view-article
                                                >
                                                    <FeedItem
                                                        actor={activity.actor}
                                                        allowDelete={activity.object.authored}
                                                        commentCount={activity.object.replyCount ?? 0}
                                                        isLoading={isLoading}
                                                        isPending={isPendingActivity(activity.id)}
                                                        layout={'inbox'}
                                                        object={activity.object}
                                                        repostCount={activity.object.repostCount ?? 0}
                                                        type={activity.type}
                                                        onClick={() => {
                                                            navigate(`/inbox-rr/${encodeURIComponent(activity.id)}`);
                                                        }}
                                                        onCommentClick={() => {}}
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
                    ) : (
                        <div className='flex w-full flex-col items-center gap-10'>
                            <div className='flex w-full max-w-[620px] flex-col items-center'>
                                <EmptyViewIndicator>
                                    <EmptyViewIcon><LucideIcon.Inbox /></EmptyViewIcon>
                                    <div>Your inbox is the home for <span className='text-black dark:text-white'>long-form posts</span>. It&apos;s empty for now, but posts will show up as soon as the people you follow share something.</div>
                                    <Button className='text-white dark:text-black' onClick={() => {
                                        navigate('/explore');
                                    }}>
                                        Find accounts to follow &rarr;
                                    </Button>
                                </EmptyViewIndicator>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Dialog
                open={isReaderOpen}
                onOpenChange={(open: boolean) => {
                    setIsReaderOpen(open);
                    if (!open) {
                        navigate('/inbox-rr');
                    }
                }}
            >
                <DialogContent className='inset-y-3 h-[calc(100vh-24px)] w-screen max-w-[calc(100vw-24px)] !animate-none p-0 focus:outline-none'>
                    <DialogHeader className='hidden'>
                        <DialogTitle>Reader</DialogTitle>
                        <DialogDescription>Ghost reader for long form articles</DialogDescription>
                    </DialogHeader>
                    {params.postId && <Reader postId={params.postId} onClose={() => {
                        navigate('/inbox-rr');
                    }} />}
                </DialogContent>
            </Dialog>
        </Layout>
    );
};

export default LongformInbox;
