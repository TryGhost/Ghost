import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import NewPostModal from './modals/NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import Separator from './global/Separator';
import getName from '../utils/get-name';
import getUsername from '../utils/get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Skeleton} from '@tryghost/shade';
import {Heading, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {handleProfileClick} from '../utils/handle-profile-click';
import {handleViewContent} from '../utils/content-handlers';
import {
    useFeedForUser,
    useInboxForUser,
    useSuggestedProfilesForUser,
    useUserDataForUser
} from '../hooks/useActivityPubQueries';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type Layout = 'inbox' | 'feed';

interface InboxProps {
    layout: Layout;
}

const Inbox: React.FC<InboxProps> = ({layout}) => {
    const {updateRoute} = useRouting();

    const {inboxQuery, updateInboxActivity} = useInboxForUser({enabled: layout === 'inbox'});
    const {feedQuery, updateFeedActivity} = useFeedForUser({enabled: layout === 'feed'});

    const feedQueryData = layout === 'inbox' ? inboxQuery : feedQuery;
    const updateActivity = layout === 'inbox' ? updateInboxActivity : updateFeedActivity;
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    // Initialise suggested profiles
    const {suggestedProfilesQuery} = useSuggestedProfilesForUser('index', 3);
    const {data: suggestedData, isLoading: isLoadingSuggested} = suggestedProfilesQuery;
    const suggested = suggestedData || Array(3).fill({actor: {}});

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const {data: user} = useUserDataForUser('index');

    return (
        <>
            <MainNavigation page={layout}/>
            <div className='z-0 mb-5 flex w-full flex-col'>
                <div className='w-full px-8'>
                    {activities.length > 0 ? (
                        <>
                            <div className={`mx-auto flex min-h-[calc(100dvh_-_117px)] items-start gap-11`}>
                                <div className='flex w-full min-w-0 flex-col items-center'>
                                    <div className={`flex w-full min-w-0 flex-col items-start ${layout === 'inbox' ? 'xxxl:max-w-[800px]' : 'max-w-[500px]'}`}>
                                        {layout === 'feed' && <div className='relative mx-[-12px] mb-4 mt-10 flex w-[calc(100%+24px)] items-center p-3'>
                                            <div className=''>
                                                <APAvatar author={user as ActorProperties} />
                                            </div>
                                            <Button aria-label='New post' className='text absolute inset-0 h-[64px] w-full justify-start rounded-lg bg-white pl-[64px] text-left text-[1.5rem] tracking-normal text-gray-500 shadow-[0_0_1px_rgba(0,0,0,.32),0_1px_6px_rgba(0,0,0,.03),0_8px_10px_-8px_rgba(0,0,0,.16)] transition-all hover:bg-white hover:shadow-[0_0_1px_rgba(0,0,0,.32),0_1px_6px_rgba(0,0,0,.03),0_8px_10px_-8px_rgba(0,0,0,.26)]' onClick={() => NiceModal.show(NewPostModal)}>What&apos;s new?</Button>
                                        </div>}
                                        <ul className={`mx-auto flex w-full flex-col ${layout === 'inbox' && 'mt-3'}`}>
                                            {activities.map((activity, index) => (
                                                <li
                                                    // eslint-disable-next-line react/no-array-index-key
                                                    key={`${activity.id}-${activity.type}-${index}`} // We are using index here as activity.id is cannot be guaranteed to be unique at the moment
                                                    data-test-view-article
                                                >
                                                    <FeedItem
                                                        actor={activity.actor}
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
                                                </li>
                                            ))}
                                            <div ref={loadMoreRef} className='h-1'></div>
                                            {isFetchingNextPage && (
                                                <div className='flex flex-col items-center justify-center space-y-4 text-center'>
                                                    <LoadingIndicator size='md' />
                                                </div>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                                <div className={`sticky top-[133px] ml-auto w-full max-w-[300px] max-lg:hidden xxxl:sticky xxxl:right-[40px]`}>
                                    <h2 className='mb-1.5 text-lg font-semibold'>This is your {layout === 'inbox' ? 'inbox' : 'feed'}</h2>
                                    <p className='mb-6 text-gray-700'>You&apos;ll find {layout === 'inbox' ? 'long-form content' : 'short posts and updates'} from the accounts you follow here.</p>
                                    <h2 className='mb-1 text-lg font-semibold'>You might also like</h2>
                                    <ul className='grow'>
                                        {suggested.map((profile, index) => {
                                            const actor = profile.actor;
                                            return (
                                                <React.Fragment key={actor.id}>
                                                    <li key={actor.id}>
                                                        <ActivityItem
                                                            onClick={() => handleProfileClick(actor)}
                                                        >
                                                            {!isLoadingSuggested ? <APAvatar author={actor} /> : <Skeleton className='z-10 h-10 w-10' />}
                                                            <div className='flex min-w-0 flex-col'>
                                                                <span className='block w-full truncate font-semibold text-black'>{!isLoadingSuggested ? getName(actor) : <Skeleton className='w-24' />}</span>
                                                                <span className='block w-full truncate text-sm text-gray-600'>{!isLoadingSuggested ? getUsername(actor) : <Skeleton className='w-40' />}</span>
                                                            </div>
                                                        </ActivityItem>
                                                    </li>
                                                    {index < suggested.length - 1 && <Separator />}
                                                </React.Fragment>
                                            );
                                        })}
                                    </ul>
                                    <Button className='mt-2 w-full' variant='outline' onClick={() => updateRoute('search')}>Explore &rarr;</Button>
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
                                <p className="text-pretty text-gray-800">
                                    {layout === 'inbox'
                                        ? 'Here you\'ll find the latest articles from accounts you\'re following.'
                                        : 'Here you\'ll find the latest posts and updates from accounts you\'re following.'
                                    }
                                    {' Go ahead and find the ones you like using the "Search" tab.'}
                                </p>
                                <p className="text-pretty text-gray-800">
                                    For more information about what you can and can&apos;t (yet) do in the beta version, check out the onboarding guide:
                                </p>
                                <a className='font-semibold text-green' href='https://forum.ghost.org/t/activitypub-beta-start-here/51780' rel='noopener noreferrer' target='_blank'>Learn more</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Inbox;
