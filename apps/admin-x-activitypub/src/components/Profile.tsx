import React, {useEffect, useRef, useState} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, List, LoadingIndicator, NoValueLabel, Tab, TabView} from '@tryghost/admin-x-design-system';

import {
    type AccountFollowsQueryResult,
    type ActivityPubCollectionQueryResult,
    useAccountFollowsForUser,
    useAccountForUser,
    useLikedForUser,
    useOutboxForUser
} from '../hooks/useActivityPubQueries';
import {FollowAccount} from '../api/activitypub';
import {handleViewContent} from '../utils/content-handlers';

import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import Separator from './global/Separator';
import ViewProfileModal from './modals/ViewProfileModal';
import {type Activity} from '../components/activities/ActivityItem';

interface UseInfiniteScrollTabProps<TData> {
    useDataHook: (key: string) => ActivityPubCollectionQueryResult<TData> | AccountFollowsQueryResult;
    emptyStateLabel: string;
    emptyStateIcon: string;
}

/**
 * Hook to abstract away the common logic for infinite scroll in the tabs
 */
const useInfiniteScrollTab = <TData,>({useDataHook, emptyStateLabel, emptyStateIcon}: UseInfiniteScrollTabProps<TData>) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useDataHook('index');

    const items = (data?.pages.flatMap((page) => {
        if ('data' in page) {
            return page.data;
        } else if ('accounts' in page) {
            return page.accounts as TData[];
        }

        return [];
    }) ?? []);

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

const handleAccountClick = (handle: string) => {
    NiceModal.show(ViewProfileModal, {handle});
};

const FollowingTab: React.FC = () => {
    const {items: accounts, EmptyState, LoadingState} = useInfiniteScrollTab<FollowAccount>({
        useDataHook: handle => useAccountFollowsForUser(handle, 'following'),
        emptyStateLabel: 'You aren\'t following anyone yet.',
        emptyStateIcon: 'user-add'
    });

    return (
        <>
            <EmptyState />
            {
                <List>
                    {accounts.map((account, index) => (
                        <React.Fragment key={account.id}>
                            <ActivityItem
                                key={account.id}
                                onClick={() => handleAccountClick(account.handle)}
                            >
                                <APAvatar author={{
                                    icon: {
                                        url: account.avatarUrl
                                    },
                                    name: account.name,
                                    handle: account.handle
                                }} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{account.name}</span>
                                        <div className='text-sm'>{account.handle}</div>
                                    </div>
                                </div>
                            </ActivityItem>
                            {index < accounts.length - 1 && <Separator />}
                        </React.Fragment>
                    ))}
                </List>
            }
            <LoadingState />
        </>
    );
};

const FollowersTab: React.FC = () => {
    const {items: accounts, EmptyState, LoadingState} = useInfiniteScrollTab<FollowAccount>({
        useDataHook: handle => useAccountFollowsForUser(handle, 'followers'),
        emptyStateLabel: 'Nobody\'s following you yet. Their loss!',
        emptyStateIcon: 'user-add'
    });

    return (
        <>
            <EmptyState />
            {
                <List>
                    {accounts.map((account, index) => (
                        <React.Fragment key={account.id}>
                            <ActivityItem
                                key={account.id}
                                onClick={() => handleAccountClick(account.handle)}
                            >
                                <APAvatar author={{
                                    icon: {
                                        url: account.avatarUrl
                                    },
                                    name: account.name,
                                    handle: account.handle
                                }} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{account.name}</span>
                                        <div className='text-sm'>{account.handle}</div>
                                    </div>
                                </div>
                            </ActivityItem>
                            {index < accounts.length - 1 && <Separator />}
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
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index');

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
            counter: account?.likedCount || 0
        },
        {
            id: 'following',
            title: 'Following',
            contents: (
                <div className='ap-following'>
                    <FollowingTab />
                </div>
            ),
            counter: account?.followingCount || 0
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <div className='ap-followers'>
                    <FollowersTab />
                </div>
            ),
            counter: account?.followerCount || 0
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

    const customFields = Object.keys(account?.customFields || {}).map((key) => {
        return {
            name: key,
            value: account!.customFields[key]
        };
    }) || [];

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
            {isLoadingAccount ? (
                <div className='flex h-[calc(100vh-8rem)] items-center justify-center'>
                    <LoadingIndicator />
                </div>
            ) : (
                <div className='z-0 mx-auto mt-8 flex w-full max-w-[580px] flex-col items-center pb-16'>
                    <div className='mx-auto w-full'>
                        {account?.bannerImageUrl && (
                            <div className='h-[200px] w-full overflow-hidden rounded-lg bg-gradient-to-tr from-grey-200 to-grey-100'>
                                <img
                                    alt={account?.name}
                                    className='h-full w-full object-cover'
                                    src={account?.bannerImageUrl}
                                />
                            </div>
                        )}
                        <div className={`${account?.bannerImageUrl && '-mt-12'} px-4`}>
                            <div className='flex items-end justify-between'>
                                <div className='rounded-xl outline outline-4 outline-white'>
                                    <APAvatar
                                        author={account && {
                                            icon: {
                                                url: account?.avatarUrl
                                            },
                                            name: account?.name,
                                            handle: account?.handle
                                        }}
                                        size='lg'
                                    />
                                </div>
                            </div>
                            <Heading className='mt-4' level={3}>{account?.name}</Heading>
                            <span className='mt-1 text-[1.5rem] text-grey-800'>
                                <span>{account?.handle}</span>
                            </span>
                            {(account?.bio || customFields.length > 0) && (
                                <div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                                    <div
                                        dangerouslySetInnerHTML={{__html: account?.bio ?? ''}}
                                        className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'
                                    />
                                    {customFields.map(customField => (
                                        <span key={customField.name} className='mt-3 line-clamp-1 flex flex-col text-[1.5rem]'>
                                            <span className={`text-xs font-semibold`}>{customField.name}</span>
                                            <span dangerouslySetInnerHTML={{__html: customField.value}} className='ap-profile-content truncate'/>
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
