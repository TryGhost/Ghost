import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import NewPostModal from './modals/NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import Separator from './global/Separator';
import ViewProfileModal from './modals/ViewProfileModal';
import getName from '../utils/get-name';
import getUsername from '../utils/get-username';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {
    GET_ACTIVITIES_QUERY_KEY_FEED,
    GET_ACTIVITIES_QUERY_KEY_INBOX,
    useActivitiesForUser,
    useSuggestedProfiles,
    useUserDataForUser
} from '../hooks/useActivityPubQueries';
import {handleViewContent} from '../utils/content-handlers';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type Layout = 'inbox' | 'feed';

interface InboxProps {
    layout: Layout;
}

const Inbox: React.FC<InboxProps> = ({layout}) => {
    const {updateRoute} = useRouting();

    // Initialise activities for the inbox or feed
    const typeFilter = layout === 'inbox'
        ? ['Create:Article']
        : ['Create:Note', 'Announce:Note'];

    const {getActivitiesQuery, updateActivity} = useActivitiesForUser({
        handle: 'index',
        includeOwn: true,
        filter: {
            type: typeFilter
        },
        key: layout === 'inbox' ? GET_ACTIVITIES_QUERY_KEY_INBOX : GET_ACTIVITIES_QUERY_KEY_FEED
    });

    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = getActivitiesQuery;

    const activities = (data?.pages.flatMap(page => page.data) ?? [])
        // If there somehow are duplicate activities, filter them out so the list rendering doesn't break
        .filter((activity, index, self) => index === self.findIndex(a => a.id === activity.id))
        // Filter out replies
        .filter((activity) => {
            return !activity.object.inReplyTo;
        });

    // Initialise suggested profiles
    const {suggestedProfilesQuery} = useSuggestedProfiles('index', 3);
    const {data: suggestedData, isLoading: isLoadingSuggested} = suggestedProfilesQuery;
    const suggested = suggestedData || [];

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
                    {isLoading ? (
                        <div className='flex flex-col items-center justify-center space-y-4 text-center'>
                            <LoadingIndicator size='lg' />
                        </div>
                    ) : activities.length > 0 ? (
                        <>
                            <div className={`mx-auto flex min-h-[calc(100dvh_-_117px)] items-start gap-11`}>
                                <div className='flex w-full min-w-0 flex-col items-center'>
                                    <div className={`flex w-full min-w-0 flex-col items-start ${layout === 'inbox' ? 'xxxl:max-w-[800px]' : 'max-w-[500px]'}`}>
                                        {layout === 'feed' && <div className='relative mx-[-12px] mb-4 mt-10 flex w-[calc(100%+24px)] items-center p-3'>
                                            <div className=''>
                                                <APAvatar author={user as ActorProperties} />
                                            </div>
                                            <Button aria-label='New post' className='text absolute inset-0 w-full rounded-lg bg-white pl-[64px] text-left text-[1.5rem] tracking-normal text-grey-500 shadow-[0_0_1px_rgba(0,0,0,.32),0_1px_6px_rgba(0,0,0,.03),0_8px_10px_-8px_rgba(0,0,0,.16)] transition-all hover:shadow-[0_0_1px_rgba(0,0,0,.32),0_1px_6px_rgba(0,0,0,.03),0_8px_10px_-8px_rgba(0,0,0,.26)]' label='What&apos;s new?' unstyled onClick={() => NiceModal.show(NewPostModal)} />
                                        </div>}
                                        <ul className={`mx-auto flex w-full flex-col ${layout === 'inbox' && 'mt-3'}`}>
                                            {activities.map((activity, index) => (
                                                <li
                                                    key={activity.id}
                                                    data-test-view-article
                                                >
                                                    <FeedItem
                                                        actor={activity.actor}
                                                        commentCount={activity.object.replyCount ?? 0}
                                                        layout={layout}
                                                        object={activity.object}
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
                                    <h2 className='mb-2 text-lg font-semibold'>This is your {layout === 'inbox' ? 'inbox' : 'feed'}</h2>
                                    <p className='mb-6 border-b border-grey-200 pb-6 text-grey-700'>You&apos;ll find {layout === 'inbox' ? 'long-form content' : 'short posts and updates'} from the accounts you follow here.</p>
                                    <h2 className='mb-2 text-lg font-semibold'>You might also like</h2>
                                    {isLoadingSuggested ? (
                                        <LoadingIndicator size="sm" />
                                    ) : (
                                        <ul className='grow'>
                                            {suggested.map((profile, index) => {
                                                const actor = profile.actor;
                                                return (
                                                    <React.Fragment key={actor.id}>
                                                        <li key={actor.id}>
                                                            <ActivityItem url={actor.url} onClick={() => NiceModal.show(ViewProfileModal, {
                                                                profile: getUsername(actor)
                                                            })}>
                                                                <APAvatar author={actor} />
                                                                <div className='flex min-w-0 flex-col'>
                                                                    <span className='block w-full truncate font-bold text-black'>{getName(actor)}</span>
                                                                    <span className='block w-full truncate text-sm text-grey-600'>{getUsername(actor)}</span>
                                                                </div>
                                                            </ActivityItem>
                                                        </li>
                                                        {index < suggested.length - 1 && <Separator />}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </ul>
                                    )}
                                    <Button className='mt-4' color='grey' fullWidth={true} label='Explore' onClick={() => updateRoute('search')} />
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
                                <p className="text-pretty text-grey-800">
                                    {layout === 'inbox'
                                        ? 'Here you\'ll find the latest articles from accounts you\'re following.'
                                        : 'Here you\'ll find the latest posts and updates from accounts you\'re following.'
                                    }
                                    {' Go ahead and find the ones you like using the "Search" tab.'}
                                </p>
                                <p className="text-pretty text-grey-800">
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
