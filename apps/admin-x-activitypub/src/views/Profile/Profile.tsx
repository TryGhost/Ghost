import React, {useEffect, useRef, useState} from 'react';

import {Button, Heading, Icon, List, LoadingIndicator, NoValueLabel, Tab,TabView} from '@tryghost/admin-x-design-system';
import {UseInfiniteQueryResult} from '@tanstack/react-query';

import {type GetProfileFollowersResponse, type GetProfileFollowingResponse} from '../../api/activitypub';
import {useAccountForUser, useLikedForUser, useProfileFollowersForUser, useProfileFollowingForUser, useProfileForUser, useProfilePostsForUser} from '@hooks/use-activity-pub-queries';

import APAvatar from '@src/components/global/APAvatar';
import ActivityItem from '@src/components/activities/ActivityItem';
import FeedItem from '@src/components/feed/FeedItem';
import FollowButton from '@src/components/global/FollowButton';
import Layout from '@src/components/layout';
import getName from '../../utils/get-name';
import getUsername from '../../utils/get-username';
import {Separator} from '@tryghost/shade';
import {handleProfileClick} from '../../utils/handle-profile-click';
import {handleViewContent} from '../../utils/content-handlers';
import {useParams} from '@tryghost/admin-x-framework';

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

    return (
        <div>
            {
                hasNextPage === false && actors.length === 0 ? (
                    <NoValueLabel icon='user-add'>
                        {noResultsMessage}
                    </NoValueLabel>
                ) : (
                    <List>
                        {actors.map(({actor, isFollowing}, index) => {
                            return (
                                <React.Fragment key={actor.id}>
                                    <ActivityItem key={actor.id}
                                        onClick={() => handleProfileClick(actor)}
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
                                    {index < actors.length - 1 && <Separator />}
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
                                    commentCount={post.object.replyCount}
                                    layout='feed'
                                    object={post.object}
                                    repostCount={post.object.repostCount}
                                    type={post.type}
                                    onClick={() => handleViewContent(post, false)}
                                    onCommentClick={() => handleViewContent(post, true)}
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

const LikesTab: React.FC<{handle: string}> = ({handle}) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useLikedForUser('index');

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

    const liked = (data?.pages.flatMap(page => page.data) ?? []);

    return (
        <div>
            {
                hasNextPage === false && liked.length === 0 ? (
                    <NoValueLabel icon="heart">
                        {handle} hasn&apos;t liked anything yet
                    </NoValueLabel>
                ) : (
                    <>
                        {liked.map((activity, index) => (
                            <div key={activity.id}>
                                <FeedItem
                                    actor={activity.object?.attributedTo || activity.actor}
                                    layout='feed'
                                    object={Object.assign({}, activity.object, {liked: true})}
                                    type={activity.type}
                                    onClick={() => handleViewContent(activity, false)}
                                    onCommentClick={() => handleViewContent(activity, true)}
                                />
                                {index < liked.length - 1 && <Separator />}
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

type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

const Profile: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');
    const {handle: urlHandle} = useParams();

    // Get current user's handle if no handle provided in URL
    const {data: currentUser, isLoading: isLoadingCurrentUser} = useAccountForUser('index');
    const handle = urlHandle || currentUser?.handle || '';

    // Always call the hook, but with empty string if no handle available
    const {data: profile, isLoading: isLoadingProfile} = useProfileForUser('index', handle);
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
                <LikesTab handle={profile.handle} />
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
            <div className='z-0 mx-auto mt-4 flex w-full max-w-[580px] flex-col items-center pb-16'>
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
                            {profile.actor.image && (<div className='h-[200px] w-full overflow-hidden rounded-lg bg-gradient-to-tr from-gray-200 to-gray-100'>
                                <img
                                    alt={profile.actor.name}
                                    className='h-full w-full object-cover'
                                    src={profile.actor.image.url}
                                />
                            </div>)}
                            <div className={`${profile.actor.image && '-mt-12'} px-6`}>
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
