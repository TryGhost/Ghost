import React, {useEffect, useRef, useState} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import {Button, Heading, List, LoadingIndicator, NoValueLabel, Tab, TabView} from '@tryghost/admin-x-design-system';
import {Skeleton} from '@tryghost/shade';

import {
    type AccountFollowsQueryResult,
    type ActivityPubCollectionQueryResult,
    useAccountFollowsForUser,
    useAccountForUser,
    usePostsByAccount,
    usePostsLikedByAccount
} from '@hooks/use-activity-pub-queries';
import {FollowAccount} from '../../api/activitypub';
import {handleViewContent} from '@utils/content-handlers';

import APAvatar from '@components/global/APAvatar';
import ActivityItem from '@components/activities/ActivityItem';
import FeedItem from '@components/feed/FeedItem';
import FollowButton from '@components/global/FollowButton';
import Layout from '@components/layout';
import Separator from '@components/global/Separator';
import ViewProfileModal from '@components/modals/ViewProfileModal';

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

    const placeholderPosts = Array(4).fill({object: {}, actor: {}});

    const LoadingState = () => (
        <>
            <div ref={loadMoreRef} className='h-1'></div>
            {
                (isLoading || isFetchingNextPage) && (
                    !isLoading ?
                        <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                            <LoadingIndicator size='md' />
                        </div> :
                        <ul>
                            {placeholderPosts.map((activity, index) => (
                                <li
                                    key={activity.id}
                                    className=''
                                    data-test-view-article
                                >
                                    <FeedItem
                                        actor={activity.actor}
                                        isLoading={true}
                                        layout='feed'
                                        object={activity.object}
                                        type={activity.type}
                                        onClick={() => handleViewContent(activity, false)}
                                        onCommentClick={() => handleViewContent(activity, true)}
                                    />
                                    {index < placeholderPosts.length - 1 && <Separator />}
                                </li>
                            ))}
                        </ul>
                )
            }
        </>
    );

    return {items, EmptyState, LoadingState};
};

const PostsTab: React.FC = () => {
    const {postsByAccountQuery, updatePostsByAccount} = usePostsByAccount({enabled: true});
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = postsByAccountQuery;

    const posts = (data?.pages.flatMap(page => page.posts) ?? [])
        .filter(post => (post.type === 'Announce' || post.type === 'Create') && !post.object?.inReplyTo);

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

    return (
        <>
            {hasNextPage === false && posts.length === 0 && (
                <NoValueLabel icon='pen'>
                    You haven&apos;t posted anything yet.
                </NoValueLabel>
            )}
            {posts.length > 0 && (
                <ul className='mx-auto flex max-w-[640px] flex-col'>
                    {posts.map((activity, index) => (
                        <li
                            key={activity.id}
                            data-test-view-article
                        >
                            <FeedItem
                                actor={activity.actor}
                                allowDelete={activity.object.authored}
                                commentCount={activity.object.replyCount}
                                layout='feed'
                                object={activity.object}
                                repostCount={activity.object.repostCount}
                                type={activity.type}
                                onClick={() => handleViewContent({
                                    ...activity,
                                    id: activity.object.id
                                }, false, updatePostsByAccount)}
                                onCommentClick={() => handleViewContent({
                                    ...activity,
                                    id: activity.object.id
                                }, true, updatePostsByAccount)}
                            />
                            {index < posts.length - 1 && <Separator />}
                        </li>
                    ))}
                </ul>
            )}
            <div ref={loadMoreRef} className='h-1'></div>
            {(isFetchingNextPage || isLoading) && (
                <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                    <LoadingIndicator size='md' />
                </div>
            )}
            <div ref={endLoadMoreRef} className='h-1'></div>
        </>
    );
};

const LikesTab: React.FC = () => {
    const {postsLikedByAccountQuery, updatePostsLikedByAccount} = usePostsLikedByAccount({enabled: true});
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = postsLikedByAccountQuery;

    const posts = (data?.pages.flatMap(page => page.posts) ?? []);

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

    return (
        <>
            {hasNextPage === false && posts.length === 0 && (
                <NoValueLabel icon='heart'>
                    You haven&apos;t liked anything yet.
                </NoValueLabel>
            )}
            {posts.length > 0 && (
                <ul className='mx-auto flex max-w-[640px] flex-col'>
                    {posts.map((activity, index) => (
                        <li key={activity.id} data-test-view-article>
                            <FeedItem
                                actor={activity.actor}
                                allowDelete={activity.object.authored}
                                commentCount={activity.object.replyCount}
                                layout='feed'
                                object={Object.assign({}, activity.object, {liked: true})}
                                repostCount={activity.object.repostCount}
                                type={activity.type}
                                onClick={() => handleViewContent(activity, false, updatePostsLikedByAccount)}
                                onCommentClick={() => handleViewContent(activity, true, updatePostsLikedByAccount)}
                            />
                            {index < posts.length - 1 && <Separator />}
                        </li>
                    ))}
                </ul>
            )}
            <div ref={loadMoreRef} className='h-1'></div>
            {(isFetchingNextPage || isLoading) && (
                <div className='mt-6 flex flex-col items-center justify-center space-y-4 text-center'>
                    <LoadingIndicator size='md' />
                </div>
            )}
            <div ref={endLoadMoreRef} className='h-1'></div>
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
                <List className='pt-3'>
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
                                    <div className='text-gray-600'>
                                        <span className='mr-1 font-bold text-black'>{account.name}</span>
                                        <div className='text-sm'>{account.handle}</div>
                                    </div>
                                </div>
                                <FollowButton
                                    className='ml-auto'
                                    following={account.isFollowing}
                                    handle={account.handle}
                                    type='secondary'
                                />
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
                <List className='pt-3'>
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
                                    <div className='text-gray-600'>
                                        <span className='mr-1 font-bold text-black'>{account.name}</span>
                                        <div className='text-sm'>{account.handle}</div>
                                    </div>
                                </div>
                                <FollowButton
                                    className='ml-auto'
                                    following={account.isFollowing}
                                    handle={account.handle}
                                    type='secondary'
                                />
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
        <Layout>
            <div className='relative isolate'>
                <div className='absolute -right-8 left-0 top-0 z-0 h-[15vw] bg-[linear-gradient(265deg,#FAFAFB_0%,#F4F5F6_100%)] dark:bg-[linear-gradient(265deg,#23272C_0%,#202327_100%)]'>
                    {account?.bannerImageUrl &&
                    <div className='h-full w-full'>
                        <img
                            alt={account?.name}
                            className='h-full w-full object-cover'
                            src={account?.bannerImageUrl}
                        />
                    </div>
                    }
                </div>
                <div className='relative z-10 mx-auto flex w-full max-w-[620px] flex-col items-center pb-16 pt-[calc(15vw-52px)]'>
                    <div className='mx-auto w-full'>
                        <div>
                            <div className='flex items-end justify-between'>
                                <div className='-ml-2 rounded-full bg-white p-1 dark:bg-black dark:outline-black'>
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
                            <Heading className='mt-4' level={3}>{!isLoadingAccount ? account?.name : <Skeleton className='w-32' />}</Heading>
                            <span className='mt-1 text-[1.5rem] text-gray-700 dark:text-gray-600'>
                                <span>{!isLoadingAccount ? account?.handle : <Skeleton className='w-full max-w-56' />}</span>
                            </span>
                            {(account?.bio || customFields.length > 0 || isLoadingAccount) && (
                                <div ref={contentRef} className={`ap-profile-content transition-max-height relative text-[1.5rem] duration-300 ease-in-out [&>p]:mb-3 ${isExpanded ? 'max-h-none pb-7' : 'max-h-[160px] overflow-hidden'} relative`}>
                                    <div className='ap-profile-content mt-3 text-[1.5rem] [&>p]:mb-3'>
                                        {!isLoadingAccount ?
                                            <div dangerouslySetInnerHTML={{__html: account?.bio ?? ''}} /> :
                                            <>
                                                <Skeleton />
                                                <Skeleton className='w-full max-w-48' />
                                            </>
                                        }
                                    </div>
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
            </div>
        </Layout>
    );
};

export default Profile;
