import ActorList from './components/ActorList';
import Error from '@components/layout/Error';
import Likes from './components/Likes';
import Posts from './components/Posts';
import ProfilePage from './components/ProfilePage';
import React, {useEffect} from 'react';
import {Activity, isApiError} from '@src/api/activitypub';
import {useAccountFollowsForUser, useAccountForUser, usePostsByAccount, usePostsLikedByAccount} from '@hooks/use-activity-pub-queries';
import {useParams} from '@tryghost/admin-x-framework';

export type ProfileTab = 'posts' | 'likes' | 'following' | 'followers';

interface ProfileProps {}

const PostsTab:React.FC<{handle: string}> = ({handle}) => {
    const {postsByAccountQuery} = usePostsByAccount(handle ? handle : 'me', {enabled: true});

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = postsByAccountQuery;

    const posts = data?.pages.flatMap((page: {posts: Activity[]}) => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}}));

    return <Posts
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage!}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        noResultsMessage={handle ? `${handle} hasn't posted anything yet` : `You haven't posted anything yet.`}
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
    const accountQuery = useAccountFollowsForUser(handle === '' ? 'me' : handle, 'following');

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = accountQuery;

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
                isFollowing: account.isFollowing,
                blockedByMe: account.blockedByMe,
                domainBlockedByMe: account.domainBlockedByMe
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
    const accountQuery = useAccountFollowsForUser(handle === '' ? 'me' : handle, 'followers');

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = accountQuery;

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

    // Validate and normalize the tab parameter
    const validTabs = ['likes', 'following', 'followers'];
    let activeTab: string = 'posts';
    let actualHandle: string | undefined = params.handle;

    // If we have a handle but no tab, check if the 'handle' is actually a tab name
    if (!params.tab && params.handle && validTabs.includes(params.handle)) {
        // This means the URL is /profile/likes (current user with tab)
        activeTab = params.handle;
        actualHandle = undefined;
    } else if (params.tab) {
        // We have both handle and tab
        if (validTabs.includes(params.tab)) {
            activeTab = params.tab;
        }
        // activeTab stays 'posts' if tab is invalid
    }
    // If no tab param, activeTab stays 'posts'

    const {data: account, isLoading: isLoadingAccount, error: accountError, refetch} = useAccountForUser('index', (actualHandle || 'me'));

    useEffect(() => {
        refetch();
    }, [actualHandle, refetch]);

    if (accountError && isApiError(accountError) && accountError.statusCode !== 404) {
        return <Error errorCode={accountError.code} statusCode={accountError.statusCode} />;
    }

    const customFields = Object.keys(account?.customFields || {}).map((key) => {
        return {
            name: key,
            value: account!.customFields[key]
        };
    }) || [];

    const postsTab = isLoadingAccount ? <></> : <PostsTab handle={actualHandle || ''} />;
    const likesTab = <LikesTab />;
    const followingTab = <FollowingTab handle={actualHandle || ''} />;
    const followersTab = <FollowersTab handle={actualHandle || ''} />;

    return <ProfilePage
        account={account!}
        activeTab={activeTab}
        actualHandle={actualHandle}
        customFields={customFields}
        followersTab={followersTab}
        followingTab={followingTab}
        isLoadingAccount={isLoadingAccount}
        likesTab={likesTab}
        postsTab={postsTab}
    />;
};

export default Profile;
