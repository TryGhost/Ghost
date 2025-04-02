import FeedInput from './FeedInput';
import FeedItem from '@src/components/feed/FeedItem';
import Layout from '@src/components/layout';
import NewPostModal from './NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import {Activity} from '@src/api/activitypub';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LucideIcon, Separator} from '@tryghost/shade';
import {EmptyViewIcon, EmptyViewIndicator} from '@src/components/global/EmptyViewIndicator';
import {LoadingIndicator} from '@tryghost/admin-x-design-system';
import {handleViewContent} from '@src/utils/content-handlers';
import {isPendingActivity} from '@src/utils/pending-activity';
import {useEffect, useRef} from 'react';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useNavigate} from '@tryghost/admin-x-framework';

export type FeedListProps = {
    isLoading: boolean,
    activities: Activity[],
    user: ActorProperties,
    fetchNextPage: () => void,
    hasNextPage: boolean,
    isFetchingNextPage: boolean
}

const FeedList:React.FC<FeedListProps> = ({
    isLoading,
    activities,
    user,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
}) => {
    const navigate = useNavigate();
    const {isEnabled} = useFeatureFlags();

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

    const loadMoreIndex = Math.max(0, Math.floor(activities.length * 0.75) - 1);

    return (
        <Layout>
            <div className='flex w-full flex-col'>
                <div className='w-full'>
                    {activities.length > 0 ? (
                        <div className='my-4'>
                            <div className='mx-auto flex items-start gap-11'>
                                <div className='flex w-full min-w-0 flex-col items-center'>
                                    <div className='flex w-full min-w-0 max-w-[620px] flex-col items-start'>
                                        <FeedInput user={user} />
                                        <ul className='mx-auto flex w-full flex-col px-4'>
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
                                                        layout={'feed'}
                                                        object={activity.object}
                                                        repostCount={activity.object.repostCount ?? 0}
                                                        type={activity.type}
                                                        onClick={() => {
                                                            if (isEnabled('ap-routes')) {
                                                                navigate(`/feed/${encodeURIComponent(activity.id)}`);
                                                            } else {
                                                                handleViewContent(activity, false);
                                                            }
                                                        }}
                                                        onCommentClick={() => {
                                                            if (isEnabled('ap-routes')) {
                                                                navigate(`/feed/${encodeURIComponent(activity.id)}?focusReply=true`);
                                                            } else {
                                                                handleViewContent(activity, true);
                                                            }
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
                            <div className='mt-4 flex w-full max-w-[620px] flex-col items-center'>
                                <FeedInput user={user} />
                                <div className='mt-[-128px]'>
                                    <EmptyViewIndicator>
                                        <EmptyViewIcon><LucideIcon.Hash /></EmptyViewIcon>
                                        <div>The Feed is the stream of thoughts and <span className='text-black dark:text-white'>bite-sized updates</span> from people you follow in the Social Web. It&apos;s looking a little empty right now but once the people you follow start posting, their updates will show up here.</div>
                                        <Button className='text-white dark:text-black' onClick={() => NiceModal.show(NewPostModal)}>
                                            <LucideIcon.FilePen />
                                            Write your first note
                                        </Button>
                                    </EmptyViewIndicator>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default FeedList;