import ActorList from './components/ActorList';
import Likes from './components/Likes';
import Posts from './components/Posts';
import ProfilePage from './components/ProfilePage';
import React, {useState} from 'react';
import {Activity} from '../../api/activitypub';
import {Tab} from '@tryghost/admin-x-design-system';
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
            noResultsMessage={`${handle || 'You'} have no following`}
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

export type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = ({}) => {
    const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');
    const params = useParams();

    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', (params.handle || 'me'));

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
            counter: account?.followingCount || '0'
        },
        {
            id: 'followers',
            title: 'Followers',
            contents: (
                <div className='ap-followers'>
                    <FollowersTab handle={params.handle || ''} />
                </div>
            ),
            counter: account?.followerCount || '0'
        }
    ].filter(Boolean) as Tab<ProfileTab>[];

    const customFields = Object.keys(account?.customFields || {}).map((key) => {
        return {
            name: key,
            value: account!.customFields[key]
        };
    }) || [];

    return <ProfilePage
        account={account!}
        customFields={customFields}
        isLoadingAccount={isLoadingAccount}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        tabs={tabs}
    />;
};

export default Profile;
