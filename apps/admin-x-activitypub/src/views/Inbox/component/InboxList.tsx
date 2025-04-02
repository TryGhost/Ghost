import FeedItem from '@src/components/feed/FeedItem';
import Layout from '@src/components/layout';
import Reader from '../Reader';
import {Activity} from '@src/api/activitypub';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, LucideIcon, Separator} from '@tryghost/shade';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {LoadingIndicator} from '@tryghost/admin-x-design-system';
import {isPendingActivity} from '@src/utils/pending-activity';
import {useEffect, useState} from 'react';
import {useNavigate, useNavigationStack, useParams} from '@tryghost/admin-x-framework';

export type InboxListProps = {
    isLoading: boolean,
    activities: Activity[],
    loadMoreIndex: number,
    loadMoreRef: React.RefObject<HTMLDivElement>,
    endLoadMoreRef: React.RefObject<HTMLDivElement>,
    isFetchingNextPage: boolean
}

const InboxList:React.FC<InboxListProps> = ({
    isLoading,
    activities,
    loadMoreIndex,
    loadMoreRef,
    endLoadMoreRef,
    isFetchingNextPage
}) => {
    const navigate = useNavigate();
    const {canGoBack, goBack} = useNavigationStack();
    const [isReaderOpen, setIsReaderOpen] = useState(false);
    const params = useParams();

    useEffect(() => {
        setIsReaderOpen(!!params.postId);
    }, [params.postId]);

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
                                                        onCommentClick={() => {
                                                            navigate(`/inbox-rr/${encodeURIComponent(activity.id)}?focusReply=true`);
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
                    if (!open) {
                        if (canGoBack) {
                            goBack();
                        } else {
                            navigate('/inbox-rr');
                        }
                    }
                    setIsReaderOpen(open);
                }}
            >
                <DialogContent className='inset-y-3 h-[calc(100vh-24px)] w-screen max-w-[calc(100vw-24px)] !animate-none p-0 focus:outline-none'>
                    <DialogHeader className='hidden'>
                        <DialogTitle>Reader</DialogTitle>
                        <DialogDescription>Ghost reader for long form articles</DialogDescription>
                    </DialogHeader>
                    {params.postId && <Reader postId={params.postId} onClose={() => {
                        if (canGoBack) {
                            goBack();
                        } else {
                            navigate('/inbox-rr');
                        }
                    }} />}
                </DialogContent>
            </Dialog>
        </Layout>
    );
};

export default InboxList;