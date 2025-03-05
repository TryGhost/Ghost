import APAvatar from '@components/global/APAvatar';
import ActivityPubWelcomeImage from '@assets/images/ap-welcome.png';
import FeedItem from '@components/feed/FeedItem';
import Layout from '@components/layout';
import NewPostModal from '@views/Feed/components/NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import Separator from '@components/global/Separator';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button} from '@tryghost/shade';
import {Heading, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {handleViewContent} from '@utils/content-handlers';
import {
    useFeedForUser,
    useInboxForUser,
    useUserDataForUser
} from '@hooks/use-activity-pub-queries';
import {useLocation} from '@tryghost/admin-x-framework';

const Inbox: React.FC = () => {
    const location = useLocation();
    const layout = location.pathname === '/feed' ? 'feed' : 'inbox';
    const {inboxQuery, updateInboxActivity} = useInboxForUser({enabled: layout === 'inbox'});
    const {feedQuery, updateFeedActivity} = useFeedForUser({enabled: layout === 'feed'});

    const feedQueryData = layout === 'inbox' ? inboxQuery : feedQuery;
    const updateActivity = layout === 'inbox' ? updateInboxActivity : updateFeedActivity;
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

    const {data: user} = useUserDataForUser('index');

    // Calculate the index at which to place the loadMoreRef - This will place it ~75% through the list
    const loadMoreIndex = Math.max(0, Math.floor(activities.length * 0.75) - 1);

    return (
        <Layout>
            <div className='my-4 flex w-full flex-col'>
                <div className='w-full'>
                    {activities.length > 0 ? (
                        <>
                            <div className={`mx-auto flex min-h-[calc(100dvh_-_117px)] items-start gap-11`}>
                                <div className='flex w-full min-w-0 flex-col items-center'>
                                    <div className={`flex w-full min-w-0 flex-col items-start ${layout !== 'inbox' && 'max-w-[620px]'}`}>
                                        {layout === 'feed' &&
                                            <div className='relative my-5 w-full'>
                                                <div className='pointer-events-none absolute left-4 top-4'>
                                                    <APAvatar author={user as ActorProperties} />
                                                </div>
                                                <Button aria-label='New post' className='text inset-0 h-[72px] w-full justify-start rounded-lg bg-white pl-[68px] text-left text-[1.5rem] font-normal tracking-normal text-gray-500 shadow-[0_5px_24px_0px_rgba(0,0,0,0.02),0px_2px_5px_0px_rgba(0,0,0,0.07),0px_0px_1px_0px_rgba(0,0,0,0.25)] transition-all hover:bg-white hover:shadow-[0_5px_24px_0px_rgba(0,0,0,0.05),0px_14px_12px_-9px_rgba(0,0,0,0.07),0px_0px_1px_0px_rgba(0,0,0,0.25)] dark:border dark:border-gray-925 dark:bg-black dark:shadow-none dark:hover:border-gray-800 dark:hover:bg-black dark:hover:shadow-none' onClick={() => NiceModal.show(NewPostModal)}>What&apos;s new?</Button>
                                            </div>
                                        }
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
                                                        layout={layout}
                                                        object={activity.object}
                                                        repostCount={activity.object.repostCount ?? 0}
                                                        type={activity.type}
                                                        onClick={() => handleViewContent(activity, false, updateActivity)}
                                                        onCommentClick={() => handleViewContent(activity, true, updateActivity)}
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
                        </>
                    ) : (
                        <div className='flex items-center justify-center text-center'>
                            <div className='flex max-w-[32em] flex-col items-center justify-center gap-4'>
                                <img
                                    alt='Ghost site logos'
                                    className='w-[220px]'
                                    src={ActivityPubWelcomeImage}
                                />
                                <Heading className='text-balance' level={2}>
                                    Welcome to ActivityPub Beta
                                </Heading>
                                <p className="text-pretty text-gray-800 dark:text-gray-600">
                                    {layout === 'inbox'
                                        ? 'Here you\'ll find the latest articles from accounts you\'re following.'
                                        : 'Here you\'ll find the latest posts and updates from accounts you\'re following.'
                                    }
                                    {' Go ahead and find the ones you like using the "Search" tab.'}
                                </p>
                                <p className="text-pretty text-gray-800 dark:text-gray-600">
                                    For more information about what you can and can&apos;t (yet) do in the beta version, check out the onboarding guide:
                                </p>
                                <a className='font-semibold text-green' href='https://forum.ghost.org/t/activitypub-beta-start-here/51780' rel='noopener noreferrer' target='_blank'>Learn more</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Inbox;
