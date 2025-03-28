import React, {useEffect, useRef, useState} from 'react';

import {Button, Heading, Icon, List, LoadingIndicator, NoValueLabel, Tab,TabView} from '@tryghost/admin-x-design-system';
import {UseInfiniteQueryResult} from '@tanstack/react-query';

import {type GetProfileFollowersResponse, type GetProfileFollowingResponse} from '../../api/activitypub';
import {useAccountForUser, usePostsLikedByAccount, useProfileFollowersForUser, useProfileFollowingForUser, useProfileForUser, useProfilePostsForUser} from '@hooks/use-activity-pub-queries';

import APAvatar from '@src/components/global/APAvatar';
import ActivityItem from '@src/components/activities/ActivityItem';
import FeedItem from '@src/components/feed/FeedItem';
import FollowButton from '@src/components/global/FollowButton';
import Layout from '@src/components/layout';
import getName from '../../utils/get-name';
import getUsername from '../../utils/get-username';
import {Separator} from '@tryghost/shade';
import {handleProfileClick, handleProfileClickRR} from '../../utils/handle-profile-click';
import {handleViewContent} from '../../utils/content-handlers';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';

const noop = () => {};

type QueryPageData = GetProfileFollowersResponse | GetProfileFollowingResponse;

type QueryFn = (handle: string, profileHandle: string) => UseInfiniteQueryResult<QueryPageData>;

type ActorListProps = {
    handle: string,
    noResultsMessage: string,
    queryFn: QueryFn,
    resolveDataFn: (data: QueryPageData) => GetProfileFollowersResponse['followers'] | GetProfileFollowingResponse['following'];
};

const ActorList: React.FC<ActorListProps> = ({
    handle,
    noResultsMessage,
    queryFn,
    resolveDataFn
}) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = queryFn('index', handle);

    const actors = (data?.pages.flatMap(resolveDataFn) ?? []);

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

    const {isEnabled} = useFeatureFlags();
    const navigate = useNavigate();

    return (
        <div className='pt-3'>
            {
                hasNextPage === false && actors.length === 0 ? (
                    <NoValueLabel icon='user-add'>
                        {noResultsMessage}
                    </NoValueLabel>
                ) : (
                    <List>
                        {actors.map(({actor, isFollowing}) => {
                            return (
                                <React.Fragment key={actor.id}>
                                    <ActivityItem key={actor.id}
                                        onClick={() => {
                                            if (isEnabled('ap-routes')) {
                                                handleProfileClickRR(actor, navigate);
                                            } else {
                                                handleProfileClick(actor);
                                            }
                                        }}
                                    >
                                        <APAvatar author={actor} />
                                        <div>
                                            <div className='text-gray-600'>
                                                <span className='mr-1 font-bold text-black'>{getName(actor)}</span>
                                                <div className='text-sm'>{getUsername(actor)}</div>
                                            </div>
                                        </div>
                                        <FollowButton
                                            className='ml-auto'
                                            following={isFollowing}
                                            handle={getUsername(actor)}
                                            type='secondary'
                                        />
                                    </ActivityItem>
                                </React.Fragment>
                            );
                        })}
                    </List>
                )
            }
            <div ref={loadMoreRef} className='h-1'></div>
            {
                (isFetchingNextPage || isLoading) && (
                    <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                        <LoadingIndicator size='md' />
                    </div>
                )
            }
        </div>
    );
};

const PostsTab: React.FC<{handle: string}> = ({handle}) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useProfilePostsForUser('index', handle);

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

    const posts = (data?.pages.flatMap(page => page.posts) ?? [])
        .filter(post => (post.type === 'Announce' || post.type === 'Create') && !post.object?.inReplyTo);

    const {isEnabled} = useFeatureFlags();
    const navigate = useNavigate();

    return (
        <div>
            {
                hasNextPage === false && posts.length === 0 ? (
                    <NoValueLabel icon='pen'>
                        {handle} has not posted anything yet
                    </NoValueLabel>
                ) : (
                    <>
                        {posts.map((post, index) => (
                            <div>
                                <FeedItem
                                    actor={post.actor}
                                    allowDelete={post.object.authored}
                                    commentCount={post.object.replyCount}
                                    layout='feed'
                                    object={post.object}
                                    repostCount={post.object.repostCount}
                                    type={post.type}
                                    onClick={() => {
                                        if (isEnabled('ap-routes')) {
                                            if (post.object.type === 'Note') {
                                                navigate(`/feed/${encodeURIComponent(post.object.id)}`);
                                            }
                                            if (post.object.type === 'Article') {
                                                navigate(`/inbox-rr/${encodeURIComponent(post.object.id)}`);
                                            }
                                        } else {
                                            handleViewContent({
                                                ...post,
                                                id: post.object.id
                                            }, false);
                                        }
                                    }}
                                    onCommentClick={() => handleViewContent({
                                        ...post,
                                        id: post.object.id
                                    }, true)}
                                />
                                {index < posts.length - 1 && <Separator />}
                            </div>
                        ))}
                    </>
                )
            }
            <div ref={loadMoreRef} className='h-1'></div>
            {
                (isFetchingNextPage || isLoading) && (
                    <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                        <LoadingIndicator size='md' />
                    </div>
                )
            }
        </div>
    );
};

const FollowingTab: React.FC<{handle: string}> = ({handle}) => {
    return (
        <ActorList
            handle={handle}
            noResultsMessage={`${handle} is not following anyone yet`}
            queryFn={useProfileFollowingForUser}
            resolveDataFn={page => ('following' in page ? page.following : [])}
        />
    );
};

const FollowersTab: React.FC<{handle: string}> = ({handle}) => {
    return (
        <ActorList
            handle={handle}
            noResultsMessage={`${handle} has no followers yet`}
            queryFn={useProfileFollowersForUser}
            resolveDataFn={page => ('followers' in page ? page.followers : [])}
        />
    );
};

const LikesTab: React.FC = () => {
    const {postsLikedByAccountQuery} = usePostsLikedByAccount({enabled: true});
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = postsLikedByAccountQuery;

    const posts = data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}}));

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const endLoadMoreRef = useRef<HTMLDivElement | null>(null);

    // Calculate the index at which to place the loadMoreRef - This will place it ~75% through the list
    const loadMoreIndex = Math.max(0, Math.floor(posts.length * 0.75) - 1);

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

    return (
        <>
            {hasNextPage === false && posts.length === 0 && (
                <NoValueLabel icon='heart'>
                    You haven&apos;t liked anything yet.
                </NoValueLabel>
            )}
            <ul className='mx-auto flex max-w-[640px] flex-col'>
                {posts.map((activity, index) => (
                    <li
                        key={`likes-${activity.id}`}
                        data-test-view-article
                    >
                        <FeedItem
                            actor={activity.actor}
                            allowDelete={activity.object.authored}
                            commentCount={activity.object.replyCount}
                            isLoading={isLoading}
                            layout='feed'
                            object={activity.object}
                            repostCount={activity.object.repostCount}
                            type={activity.type}
                            onClick={() => handleViewContent(activity, false)}
                            onCommentClick={() => handleViewContent(activity, true)}
                        />
                        {index < posts.length - 1 && <Separator />}
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
        </>
    );
};

type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

const Profile: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');
    const {handle: urlHandle} = useParams();

    // Reset selected tab when route changes
    useEffect(() => {
        setSelectedTab('posts');
    }, [urlHandle]);

    // Get current user's handle if no handle provided in URL
    const {data: currentUser, isLoading: isLoadingCurrentUser} = useAccountForUser('index');
    const handle = urlHandle || currentUser?.handle || '';

    // Only call useProfileForUser when we have a valid handle
    const {data: profile, isLoading: isLoadingProfile} = useProfileForUser('index', handle, Boolean(handle));
    const isCurrentUser = profile?.handle === currentUser?.handle;

    const isLoading = isLoadingCurrentUser || isLoadingProfile;

    const attachments = (profile?.actor.attachment || []);

    const tabs = isLoading === false && typeof profile !== 'string' && profile ? [
        {
            id: 'posts',
            title: 'Posts',
            contents: (
                <PostsTab handle={profile.handle} />
            )
        },
        // Only show Likes tab for current user
        isCurrentUser && {
            id: 'likes',
            title: 'Likes',
            contents: (
                <LikesTab />
            )
        },
        {
            id: 'following',
            title: 'Following',
            contents: (
                <FollowingTab handle={profile.handle} />
            ),
            counter: profile.followingCount
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <FollowersTab handle={profile.handle} />
            ),
            counter: profile.followerCount
        }
    ].filter(Boolean) as Tab<ProfileTab>[] : [];

    const [isExpanded, setisExpanded] = useState(false);

    const toggleExpand = () => {
        setisExpanded(!isExpanded);
    };

    const contentRef = useRef<HTMLDivElement | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > 160); // Compare content height to max height
        }
    }, [isExpanded, profile]);

    return (
        <Layout>
            <div className='z-0 -mx-8 -mt-9 flex flex-col items-center pb-16'>
                <div className='mx-auto w-full'>
                    {isLoading && (
                        <LoadingIndicator size='lg' />
                    )}
                    {!isLoading && !profile && (
                        <NoValueLabel icon='user-add'>
                            Profile not found
                        </NoValueLabel>
                    )}
                    {!isLoading && profile && (
                        <>
                            {profile.actor.image ?
                                <div className='h-[15vw] w-full overflow-hidden bg-gradient-to-tr from-gray-200 to-gray-100'>
                                    <img
                                        alt={profile.actor.name}
                                        className='h-full w-full object-cover'
                                        src={profile.actor.image.url}
                                    />
                                </div>
                                :
                                <div className='h-[8vw] w-full overflow-hidden bg-gradient-to-tr from-white to-white'></div>
                            }
                            <div className='mx-auto -mt-12 max-w-[620px] px-6'>
                                <div className='flex items-end justify-between'>
                                    <div className='-ml-2 rounded-full bg-white p-1 dark:bg-black'>
                                        <APAvatar
                                            author={profile.actor}
                                            size='lg'
                                        />
                                    </div>
                                    {!isCurrentUser &&
                                        <FollowButton
                                            following={profile.isFollowing}
                                            handle={profile.handle}
                                            type='primary'
                                            onFollow={noop}
                                            onUnfollow={noop}
                                        />
                                    }
                                </div>
                                <Heading className='mt-4' level={3}>{profile.actor.name}</Heading>
                                <a className='group/handle mt-1 flex items-center gap-1 text-[1.5rem] text-gray-800 hover:text-gray-900' href={profile?.actor.url} rel='noopener noreferrer' target='_blank'><span>{profile.handle}</span><Icon className='opacity-0 transition-opacity group-hover/handle:opacity-100' name='arrow-top-right' size='xs'/></a>
                                {(profile.actor.summary || attachments.length > 0) && (<div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                                    <div
                                        dangerouslySetInnerHTML={{__html: profile.actor.summary}}
                                        className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'
                                    />
                                    {attachments.map((attachment: {name: string, value: string}) => (
                                        <span className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                            <span className={`text-xs font-semibold`}>{attachment.name}</span>
                                            <span dangerouslySetInnerHTML={{__html: attachment.value}} className='ap-profile-content truncate'/>
                                        </span>
                                    ))}
                                    {!isExpanded && isOverflowing && (
                                        <div className='absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 via-60% to-transparent' />
                                    )}
                                    {isOverflowing && <Button
                                        className='absolute bottom-0'
                                        label={isExpanded ? 'Show less' : 'Show all'}
                                        link={true}
                                        size='sm'
                                        onClick={toggleExpand}
                                    />}
                                </div>)}
                                <TabView<ProfileTab>
                                    containerClassName='mt-6'
                                    selectedTab={selectedTab}
                                    tabs={tabs}
                                    onTabChange={setSelectedTab}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Profile;
