import APAvatar from './global/APAvatar';
import ActivityItem, {type Activity} from './activities/ActivityItem';
import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import ArticleModal from './feed/ArticleModal';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import getUsername from '../utils/get-username';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {useActivitiesForUser, useSuggestedProfiles} from '../hooks/useActivityPubQueries';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface InboxProps {}

const Inbox: React.FC<InboxProps> = ({}) => {
    const [, setArticleContent] = useState<ObjectProperties | null>(null);
    const [, setArticleActor] = useState<ActorProperties | null>(null);
    const [layout, setLayout] = useState('inbox');

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useActivitiesForUser({
        handle: 'index',
        includeReplies: true,
        excludeNonFollowers: true,
        filter: {
            type: ['Create:Article:notReply', 'Create:Note:notReply', 'Announce:Note']
        }
    });

    const {updateRoute} = useRouting();

    const {suggestedProfilesQuery} = useSuggestedProfiles('index', ['@index@activitypub.ghost.org', '@index@john.onolan.org', '@index@coffeecomplex.ghost.io', '@index@codename-jimmy.ghost.io', '@index@syphoncontinuity.ghost.io']);
    const {data: suggested = [], isLoading: isLoadingSuggested} = suggestedProfilesQuery;

    const activities = (data?.pages.flatMap(page => page.data) ?? []).filter((activity) => {
        return !activity.object.inReplyTo;
    });

    const handleViewContent = (object: ObjectProperties, actor: ActorProperties, comments: Activity[], focusReply = false) => {
        setArticleContent(object);
        setArticleActor(actor);
        NiceModal.show(ArticleModal, {object, actor, comments, focusReply});
    };

    function getContentAuthor(activity: Activity) {
        const actor = activity.actor;
        const attributedTo = activity.object.attributedTo;

        if (!attributedTo) {
            return actor;
        }

        if (typeof attributedTo === 'string') {
            return actor;
        }

        if (Array.isArray(attributedTo)) {
            const found = attributedTo.find(item => typeof item !== 'string');
            if (found) {
                return found;
            } else {
                return actor;
            }
        }

        return attributedTo;
    }

    const handleLayoutChange = (newLayout: string) => {
        setLayout(newLayout);
    };

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
            <MainNavigation page='home' title="Home" onLayoutChange={handleLayoutChange} />
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
                                                onClick={() => handleViewContent(
                                                    activity.object,
                                                    getContentAuthor(activity),
                                                    activity.object.replies
                                                )}
                                            >
                                                <FeedItem
                                                    actor={activity.actor}
                                                    comments={activity.object.replies}
                                                    layout={layout}
                                                    object={activity.object}
                                                    type={activity.type}
                                                    onCommentClick={() => handleViewContent(
                                                        activity.object,
                                                        getContentAuthor(activity),
                                                        activity.object.replies,
                                                        true
                                                    )}
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
                                                        <ActivityItem url={actor.url}>
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
