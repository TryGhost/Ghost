import React, {useEffect, useRef, useState} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, List, LoadingIndicator, NoValueLabel, Tab, TabView} from '@tryghost/admin-x-design-system';

import getName from '../utils/get-name';
import getUsername from '../utils/get-username';
import {
    type ActivityPubCollectionQueryResult,
    useFollowersCountForUser,
    useFollowersForUser,
    useFollowingCountForUser,
    useFollowingForUser,
    useLikedCountForUser,
    useLikedForUser,
    useOutboxForUser,
    useUserDataForUser
} from '../hooks/useActivityPubQueries';
import {handleViewContent} from '../utils/content-handlers';

import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import Separator from './global/Separator';
import ViewProfileModal from './modals/ViewProfileModal';
import {type Activity} from '../components/activities/ActivityItem';

interface UseInfiniteScrollTabProps<TData> {
    useDataHook: (key: string) => ActivityPubCollectionQueryResult<TData>;
    emptyStateLabel: string;
    emptyStateIcon: string;
}

/**
 * Hook to abstract away the common logic for infinite scroll in tabs
 */
const useInfiniteScrollTab = <TData,>({useDataHook, emptyStateLabel, emptyStateIcon}: UseInfiniteScrollTabProps<TData>) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useDataHook('index');

    const items = (data?.pages.flatMap(page => page.data) ?? []);

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

    const EmptyState = () => (
        hasNextPage === false && items.length === 0 && (
            <NoValueLabel icon={emptyStateIcon}>
                {emptyStateLabel}
            </NoValueLabel>
        )
    );

    const LoadingState = () => (
        <>
            <div ref={loadMoreRef} className='h-1'></div>
            {
                (isLoading || isFetchingNextPage) && (
                    <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                        <LoadingIndicator size='md' />
                    </div>
                )
            }
        </>
    );

    return {items, EmptyState, LoadingState};
};

const PostsTab: React.FC = () => {
    const {items, EmptyState, LoadingState} = useInfiniteScrollTab<Activity>({
        useDataHook: useOutboxForUser,
        emptyStateLabel: 'You haven\'t posted anything yet.',
        emptyStateIcon: 'pen'
    });

    const posts = items.filter(post => post.type === 'Create' && !post.object?.inReplyTo);

    return (
        <>
            <EmptyState />
            {
                posts.length > 0 && (
                    <ul className='mx-auto flex max-w-[640px] flex-col'>
                        {posts.map((activity, index) => (
                            <li
                                key={activity.id}
                                data-test-view-article
                            >
                                <FeedItem
                                    actor={activity.actor}
                                    layout='feed'
                                    object={activity.object}
                                    type={activity.type}
                                    onClick={() => handleViewContent(activity, false)}
                                    onCommentClick={() => handleViewContent(activity, true)}
                                />
                                {index < posts.length - 1 && <Separator />}
                            </li>
                        ))}
                    </ul>
                )
            }
            <LoadingState />
        </>
    );
};

const LikesTab: React.FC = () => {
    const {items: liked, EmptyState, LoadingState} = useInfiniteScrollTab<Activity>({
        useDataHook: useLikedForUser,
        emptyStateLabel: 'You haven\'t liked anything yet.',
        emptyStateIcon: 'heart'
    });

    return (
        <>
            <EmptyState />
            {
                liked.length > 0 && (
                    <ul className='mx-auto flex max-w-[640px] flex-col'>
                        {liked.map((activity, index) => (
                            <li
                                key={activity.id}
                                data-test-view-article
                            >
                                <FeedItem
                                    actor={activity.object?.attributedTo as ActorProperties || activity.actor}
                                    layout='feed'
                                    object={Object.assign({}, activity.object, {liked: true})}
                                    type={activity.type}
                                    onClick={() => handleViewContent(activity, false)}
                                    onCommentClick={() => handleViewContent(activity, true)}
                                />
                                {index < liked.length - 1 && <Separator />}
                            </li>
                        ))}
                    </ul>
                )
            }
            <LoadingState />
        </>
    );
};

const handleUserClick = (actor: ActorProperties) => {
    NiceModal.show(ViewProfileModal, {
        profile: getUsername(actor)
    });
};

const FollowingTab: React.FC = () => {
    const {items: following, EmptyState, LoadingState} = useInfiniteScrollTab<ActorProperties>({
        useDataHook: useFollowingForUser,
        emptyStateLabel: 'You aren\'t following anyone yet.',
        emptyStateIcon: 'user-add'
    });

    return (
        <>
            <EmptyState />
            {
                <List>
                    {following.map((item, index) => (
                        <React.Fragment key={item.id}>
                            <ActivityItem
                                key={item.id}
                                url={item.url}
                                onClick={() => handleUserClick(item)}
                            >
                                <APAvatar author={item} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{getName(item)}</span>
                                        <div className='text-sm'>{getUsername(item)}</div>
                                    </div>
                                </div>
                            </ActivityItem>
                            {index < following.length - 1 && <Separator />}
                        </React.Fragment>
                    ))}
                </List>
            }
            <LoadingState />
        </>
    );
};

const FollowersTab: React.FC = () => {
    const {items: followers, EmptyState, LoadingState} = useInfiniteScrollTab<ActorProperties>({
        useDataHook: useFollowersForUser,
        emptyStateLabel: 'Nobody\'s following you yet. Their loss!',
        emptyStateIcon: 'user-add'
    });

    return (
        <>
            <EmptyState />
            {
                <List>
                    {followers.map((item, index) => (
                        <React.Fragment key={item.id}>
                            <ActivityItem
                                key={item.id}
                                url={item.url}
                                onClick={() => handleUserClick(item)}
                            >
                                <APAvatar author={item} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{item.name || getName(item) || 'Unknown'}</span>
                                        <div className='text-sm'>{getUsername(item)}</div>
                                    </div>
                                </div>
                            </ActivityItem>
                            {index < followers.length - 1 && <Separator />}
                        </React.Fragment>
                    ))}
                </List>
            }
            <LoadingState />
        </>
    );
};

type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = ({}) => {
    const {data: followersCount = 0, isLoading: isLoadingFollowersCount} = useFollowersCountForUser('index');
    const {data: followingCount = 0, isLoading: isLoadingFollowingCount} = useFollowingCountForUser('index');
    const {data: likedCount = 0, isLoading: isLoadingLikedCount} = useLikedCountForUser('index');
    const {data: userProfile, isLoading: isLoadingProfile} = useUserDataForUser('index') as {data: ActorProperties | null, isLoading: boolean};

    const isInitialLoading = isLoadingProfile || isLoadingFollowersCount || isLoadingFollowingCount || isLoadingLikedCount;

    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: (
                <div className='ap-posts'>
                    <PostsTab />
                </div>
            )
        },
        {
            id: 'likes',
            title: 'Likes',
            contents: (
                <div className='ap-likes'>
                    <LikesTab />
                </div>
            ),
            counter: likedCount
        },
        {
            id: 'following',
            title: 'Following',
            contents: (
                <div className='ap-following'>
                    <FollowingTab />
                </div>
            ),
            counter: followingCount
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <div className='ap-followers'>
                    <FollowersTab />
                </div>
            ),
            counter: followersCount
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

    const attachments = (userProfile?.attachment || []);

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
    }, [isExpanded]);

    return (
        <>
            <MainNavigation page='profile' />
            {isInitialLoading ? (
                <div className='flex h-[calc(100vh-8rem)] items-center justify-center'>
                    <LoadingIndicator />
                </div>
            ) : (
                <div className='z-0 mx-auto mt-8 flex w-full max-w-[580px] flex-col items-center pb-16'>
                    <div className='mx-auto w-full'>
                        {userProfile?.image && (
                            <div className='h-[200px] w-full overflow-hidden rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                                <img
                                    alt={userProfile?.name}
                                    className='h-full w-full object-cover'
                                    src={userProfile?.image.url}
                                />
                            </div>
                        )}
                        <div className={`${userProfile?.image && '-mt-12'} px-4`}>
                            <div className='flex items-end justify-between'>
                                <div className='rounded-xl outline outline-4 outline-white'>
                                    <APAvatar
                                        author={userProfile as ActorProperties}
                                        size='lg'
                                    />
                                </div>
                            </div>
                            <Heading className='mt-4' level={3}>{userProfile?.name}</Heading>
                            <span className='mt-1 text-[1.5rem] text-grey-800'>
                                <span>{userProfile && getUsername(userProfile)}</span>
                            </span>
                            {(userProfile?.summary || attachments.length > 0) && (
                                <div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                                    <div
                                        dangerouslySetInnerHTML={{__html: userProfile?.summary ?? ''}}
                                        className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'
                                    />
                                    {attachments.map(attachment => (
                                        <span className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                            <span className={`text-xs font-semibold`}>{attachment.name}</span>
                                            <span dangerouslySetInnerHTML={{__html: attachment.value}} className='ap-profile-content truncate'/>
                                        </span>
                                    ))}
                                    {!isExpanded && isOverflowing && (
                                        <div className='absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 via-60% to-transparent' />
                                    )}
                                    {isOverflowing && <Button
                                        className='absolute bottom-0 text-pink'
                                        label={isExpanded ? 'Show less' : 'Show all'}
                                        link={true}
                                        onClick={toggleExpand}
                                    />}
                                </div>
                            )}
                            <TabView<ProfileTab>
                                containerClassName='mt-6'
                                selectedTab={selectedTab}
                                tabs={tabs}
                                onTabChange={setSelectedTab}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Profile;
