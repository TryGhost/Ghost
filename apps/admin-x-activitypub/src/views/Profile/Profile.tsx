import ActorList from './components/ActorList';
import Likes from './components/Likes';
import Posts from './components/Posts';
import ProfilePage from './components/ProfilePage';
import React from 'react';
import {Activity} from '@src/api/activitypub';
import {useAccountFollowsForUser, useAccountForUser, usePostsByAccount, usePostsLikedByAccount, useProfileFollowersForUser, useProfileFollowingForUser, useProfilePostsForUser} from '@hooks/use-activity-pub-queries';
import {useParams} from '@tryghost/admin-x-framework';

export type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

interface ProfileProps {}

const PostsTab:React.FC<{handle?: string}> = ({handle}) => {
    const postsByAccountQuery = usePostsByAccount({enabled: true}).postsByAccountQuery;
    const profilePostsQuery = useProfilePostsForUser('index', handle || '');

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

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = handle === '' ? accountQuery : profileQuery;

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

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = handle === '' ? accountQuery : profileQuery;

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

const Profile: React.FC<ProfileProps> = ({}) => {
    const params = useParams();

    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', (params.handle || 'me'));

    const customFields = Object.keys(account?.customFields || {}).map((key) => {
        return {
            name: key,
            value: account!.customFields[key]
        };
    }) || [];

    const postsTab = <PostsTab handle={params.handle} />;
    const likesTab = <LikesTab />;
    const followingTab = <FollowingTab handle={params.handle || ''} />;
    const followersTab = <FollowersTab handle={params.handle || ''} />;

    return <ProfilePage
        account={account!}
        customFields={customFields}
        followersTab={followersTab}
        followingTab={followingTab}
        isLoadingAccount={isLoadingAccount}
        likesTab={likesTab}
        postsTab={postsTab}
    />;
};

export default Profile;
