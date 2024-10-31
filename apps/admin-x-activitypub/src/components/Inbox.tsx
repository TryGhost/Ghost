import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import ViewProfileModal from './global/ViewProfileModal';
import getUsername from '../utils/get-username';
import {Button, Heading, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {handleViewContent} from '../utils/content-handlers';
import {useActivitiesForUser, useSuggestedProfiles} from '../hooks/useActivityPubQueries';
import {useLayout} from '../hooks/layout';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface InboxProps {}

const Inbox: React.FC<InboxProps> = ({}) => {
    const {layout, setFeed, setInbox} = useLayout();

    const {getActivitiesQuery, updateActivity} = useActivitiesForUser({
        handle: 'index',
        excludeNonFollowers: true,
        filter: {
            type: ['Create:Article', 'Create:Note', 'Announce:Note']
        }
    });
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = getActivitiesQuery;

    const {updateRoute} = useRouting();

    const {suggestedProfilesQuery} = useSuggestedProfiles('index', ['@index@activitypub.ghost.org', '@index@john.onolan.org', '@index@coffeecomplex.ghost.io', '@index@codename-jimmy.ghost.io', '@index@syphoncontinuity.ghost.io']);
    const {data: suggested = [], isLoading: isLoadingSuggested} = suggestedProfilesQuery;

    const activities = (data?.pages.flatMap(page => page.data) ?? []).filter((activity) => {
        return !activity.object.inReplyTo;
    });

    // Intersection observer to fetch more activities when the user scrolls
    // to the bottom of the page
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

    return (
        <>
            <MainNavigation layout={layout} page='home' setFeed={setFeed} setInbox={setInbox}/>
            <div className='z-0 my-5 flex w-full flex-col'>
                <div className='w-full px-8'>
                    {isLoading ? (
                        <div className='flex flex-col items-center justify-center space-y-4 text-center'>
                            <LoadingIndicator size='lg' />
                        </div>
                    ) : activities.length > 0 ? (
                        <>
                            <div className={`mx-auto flex items-start ${layout === 'inbox' ? 'max-w-6xl gap-14' : 'gap-8'}`}>
                                <div className='flex w-full min-w-0 items-start'>
                                    <ul className={`mx-auto flex ${layout === 'inbox' ? 'max-w-full' : 'max-w-[500px]'} flex-col`}>
                                        {activities.map((activity, index) => (
                                            <li
                                                key={activity.id}
                                                data-test-view-article
                                                onClick={() => handleViewContent(activity, false, updateActivity)}
                                            >
                                                <FeedItem
                                                    actor={activity.actor}
                                                    commentCount={activity.object.replyCount ?? 0}
                                                    layout={layout}
                                                    object={activity.object}
                                                    type={activity.type}
                                                    onCommentClick={() => handleViewContent(activity, true, updateActivity)}
                                                />
                                                {index < activities.length - 1 && (
                                                    <div className="h-px w-full bg-grey-200"></div>
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
                                <div className={`sticky top-[135px] ml-auto w-full max-w-[300px] max-lg:hidden ${layout === 'inbox' ? '' : ' xxxl:fixed xxxl:right-[40px]'}`}>
                                    <h2 className='mb-2 text-lg font-semibold'>You might also like...</h2>
                                    {isLoadingSuggested ? (
                                        <LoadingIndicator size="sm" />
                                    ) : (
                                        <ul className='grow'>
                                            {suggested.map((profile) => {
                                                const actor = profile.actor;
                                                // const isFollowing = profile.isFollowing;
                                                return (
                                                    <li key={actor.id}>
                                                        <ActivityItem url={actor.url} onClick={() => NiceModal.show(ViewProfileModal, {
                                                            profile: getUsername(actor),
                                                            onFollow: () => {},
                                                            onUnfollow: () => {}
                                                        })}>
                                                            <APAvatar author={actor} />
                                                            <div>
                                                                <div className='text-grey-600'>
                                                                    <span className='mr-1 truncate font-bold text-black'>{actor.name || actor.preferredUsername || 'Unknown'}</span>
                                                                    <div className='truncate text-sm'>{getUsername(actor)}</div>
                                                                </div>
                                                            </div>
                                                            {/* <FollowButton
                                                                className='ml-auto'
                                                                following={isFollowing}
                                                                handle={getUsername(actor)}
                                                                type='link'
                                                                onFollow={() => updateSuggestedProfile(actor.id!, {isFollowing: true})}
                                                                onUnfollow={() => updateSuggestedProfile(actor.id!, {isFollowing: false})}
                                                            /> */}
                                                        </ActivityItem>
                                                    </li>
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
                                    Here you&apos;ll find the latest posts from accounts you&apos;re following, so go ahead and find the ones you like using the &quot;Search&quot; tab.
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
