import React, {useEffect, useRef, useState} from 'react';

import {Button, Heading, Tab, TabView} from '@tryghost/admin-x-design-system';
import {Skeleton} from '@tryghost/shade';

import APAvatar from '@components/global/APAvatar';
import ActorList from './components/ActorList';
import Layout from '@components/layout';
import Likes from './components/Likes';
import Posts from './components/Posts';
import {Activity} from '../../api/activitypub';
import {
    useAccountFollowsForUser,
    useAccountForUser,
    usePostsByAccount,
    usePostsLikedByAccount,
    useProfileFollowersForUser,
    useProfileFollowingForUser,
    useProfilePostsForUser
} from '@hooks/use-activity-pub-queries';
import {useParams} from '@tryghost/admin-x-framework';

const PostsTab:React.FC<{handle?: string}> = ({handle}) => {
    // TODO: for some reason if the last activity for the current account is a repost then it sticks on the top of the postlist

    // Call both hooks unconditionally
    const postsByAccountQuery = usePostsByAccount({enabled: true}).postsByAccountQuery;
    const profilePostsQuery = useProfilePostsForUser('index', handle || '');

    // Use the appropriate query result based on whether handle is provided
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = handle ? profilePostsQuery : postsByAccountQuery;

    const posts = data?.pages.flatMap((page: {posts: Activity[]}) => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}}));

    return <Posts
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage!}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        posts={posts}
    />;
};

const LikesTab: React.FC = () => {
    const {postsLikedByAccountQuery} = usePostsLikedByAccount({enabled: true});
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = postsLikedByAccountQuery;

    const posts = data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}}));

    return <Likes
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage!}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        posts={posts}
    />;
};

const FollowingTab: React.FC<{handle: string}> = ({handle}) => {
    const accountQuery = useAccountFollowsForUser('index', 'following');
    const profileQuery = useProfileFollowingForUser('index', handle);

    // Use account query for our own profile (empty handle) and profile query for others
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = handle === '' ? accountQuery : profileQuery;

    // Transform the data into the format expected by ActorList
    const actors = data?.pages.flatMap((page) => {
        if ('following' in page) {
            return page.following;
        } else if ('accounts' in page) {
            return page.accounts.map(account => ({
                actor: {
                    id: account.id,
                    name: account.name,
                    handle: account.handle,
                    icon: {
                        url: account.avatarUrl
                    }
                },
                isFollowing: account.isFollowing
            }));
        }
        return [];
    }) ?? [];

    return (
        <ActorList
            actors={actors}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage!}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            noResultsMessage={`${handle || 'You'} have no followers yet`}
        />
    );
};

const FollowersTab: React.FC<{handle: string}> = ({handle}) => {
    const accountQuery = useAccountFollowsForUser('index', 'followers');
    const profileQuery = useProfileFollowersForUser('index', handle);

    // Use account query for our own profile (empty handle) and profile query for others
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = handle === '' ? accountQuery : profileQuery;

    // Transform the data into the format expected by ActorList
    const actors = data?.pages.flatMap((page) => {
        if ('followers' in page) {
            return page.followers;
        } else if ('accounts' in page) {
            return page.accounts.map(account => ({
                actor: {
                    id: account.id,
                    name: account.name,
                    handle: account.handle,
                    icon: {
                        url: account.avatarUrl
                    }
                },
                isFollowing: account.isFollowing
            }));
        }
        return [];
    }) ?? [];

    return (
        <ActorList
            actors={actors}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage!}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            noResultsMessage={`${handle || 'You'} have no followers yet`}
        />
    );
};

type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = ({}) => {
    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');
    const params = useParams();

    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', 'me');

    const tabs = [
        {
            id: 'posts',
            title: 'Posts',
            contents: (
                <div className='ap-posts'>
                    <PostsTab handle={params.handle} />
                </div>
            )
        },
        !params.handle && {
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
                    <FollowingTab handle={params.handle || ''} />
                </div>
            ),
            counter: account?.followingCount || 0
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <div className='ap-followers'>
                    <FollowersTab handle={params.handle || ''} />
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
                <div className='absolute -right-8 left-0 top-0 z-0 h-[5vw]'>
                    {account?.bannerImageUrl &&
                    <div className='size-full'>
                        <img
                            alt={account?.name}
                            className='size-full object-cover'
                            src={account?.bannerImageUrl}
                        />
                    </div>
                    }
                </div>
                <div className='relative z-10 mx-auto flex w-full max-w-[620px] flex-col items-center pb-16 pt-[calc(5vw-52px)]'>
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
