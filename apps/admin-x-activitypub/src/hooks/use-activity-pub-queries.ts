import {
    type Account,
    type AccountFollowsType,
    type AccountSearchResult,
    ActivityPubAPI,
    ActivityPubCollectionResponse,
    FollowAccount,
    type GetAccountFollowsResponse,
    type SearchResults
} from '../api/activitypub';
import {Activity, ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {
    type QueryClient,
    type UseInfiniteQueryResult,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient
} from '@tanstack/react-query';
import {exploreSites} from '@src/lib/explore-sites';
import {formatPendingActivityContent, generatePendingActivity, generatePendingActivityId} from '../utils/pending-activity';
import {mapPostToActivity} from '../utils/posts';
import {showToast} from '@tryghost/admin-x-design-system';
import {useCallback} from 'react';

export type ActivityPubCollectionQueryResult<TData> = UseInfiniteQueryResult<ActivityPubCollectionResponse<TData>>;
export type AccountFollowsQueryResult = UseInfiniteQueryResult<GetAccountFollowsResponse>;

let SITE_URL: string;

async function getSiteUrl() {
    if (!SITE_URL) {
        const response = await fetch('/ghost/api/admin/site');
        const json = await response.json();
        SITE_URL = json.site.url;
    }

    return SITE_URL;
}

function createActivityPubAPI(handle: string, siteUrl: string) {
    return new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
}

const QUERY_KEYS = {
    outbox: (handle: string) => ['outbox', handle],
    liked: (handle: string) => ['liked', handle],
    user: (handle: string) => ['user', handle],
    profilePosts: (profileHandle: string | null) => {
        if (profileHandle === null) {
            return ['profile_posts'];
        }
        return ['profile_posts', profileHandle];
    },
    profileFollowers: (profileHandle: string) => ['profile_followers', profileHandle],
    profileFollowing: (profileHandle: string) => ['profile_following', profileHandle],
    account: (handle: string) => ['account', handle],
    accountFollows: (handle: string, type: AccountFollowsType) => ['account_follows', handle, type],
    searchResults: (query: string) => ['search_results', query],
    suggestedProfiles: (handle: string, limit: number) => ['suggested_profiles', handle, limit],
    exploreProfiles: (handle: string) => ['explore_profiles', handle],
    thread: (id: string | null) => {
        if (id === null) {
            return ['thread'];
        }
        return ['thread', id];
    },
    feed: ['feed'],
    inbox: ['inbox'],
    postsByAccount: ['account_posts'],
    postsLikedByAccount: ['account_liked_posts'],
    notifications: (handle: string) => ['notifications', handle],
    post: (id: string) => ['post', id]
};

function updateLikedCache(queryClient: QueryClient, queryKey: string[], id: string, liked: boolean) {
    queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
        if (current === undefined) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page: {posts: Activity[]}) => {
                return {
                    ...page,
                    posts: page.posts.map((item: Activity) => {
                        if (item.object.id === id) {
                            return {
                                ...item,
                                object: {
                                    ...item.object,
                                    liked: liked
                                }
                            };
                        }

                        return item;
                    })
                };
            })
        };
    });

    // For the likes tab, add/remove the post
    if (queryKey === QUERY_KEYS.postsLikedByAccount) {
        queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                pages: current.pages.map((page: {posts: Activity[]}) => {
                    return {
                        ...page,
                        posts: liked
                            // If liking, keep the post (it will be added via refetch)
                            ? page.posts
                            // If unliking, remove the post
                            : page.posts.filter(item => item.object.id !== id)
                    };
                })
            };
        });

        // Invalidate the likes tab query to refetch and get the new post when liking
        if (liked) {
            queryClient.invalidateQueries({queryKey: QUERY_KEYS.postsLikedByAccount});
        }
    }

    // Update the thread cache
    const threadQueryKey = QUERY_KEYS.thread(null);
    queryClient.setQueriesData(threadQueryKey, (current?: {posts: Activity[]}) => {
        if (!current) {
            return current;
        }

        return {
            posts: current.posts.map((activity) => {
                if (activity.object.id === id) {
                    return {
                        ...activity,
                        object: {
                            ...activity.object,
                            liked
                        }
                    };
                }
                return activity;
            })
        };
    });
}

function updateReplyCountInCache(queryClient: QueryClient, id: string, delta: number) {
    const queryKeys = [
        QUERY_KEYS.feed,
        QUERY_KEYS.inbox,
        QUERY_KEYS.postsByAccount,
        QUERY_KEYS.postsLikedByAccount
    ];

    for (const queryKey of queryKeys) {
        queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                pages: current.pages.map(page => ({
                    ...page,
                    posts: page.posts.map((activity) => {
                        if (activity.object.id === id) {
                            return {
                                ...activity,
                                object: {
                                    ...activity.object,
                                    replyCount: Math.max((activity.object.replyCount ?? 0) + delta, 0)
                                }
                            };
                        }
                        return activity;
                    })
                }))
            };
        });
    }

    // Update thread cache
    const threadQueryKey = QUERY_KEYS.thread(null);
    queryClient.setQueriesData(threadQueryKey, (current?: {posts: Activity[]}) => {
        if (!current) {
            return current;
        }

        return {
            posts: current.posts.map((activity) => {
                if (activity.object.id === id) {
                    return {
                        ...activity,
                        object: {
                            ...activity.object,
                            replyCount: Math.max((activity.object.replyCount ?? 0) + delta, 0)
                        }
                    };
                }
                return activity;
            })
        };
    });
}

export function useLikeMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.like(id);
        },
        onMutate: (id) => {
            updateLikedCache(queryClient, QUERY_KEYS.feed, id, true);
            updateLikedCache(queryClient, QUERY_KEYS.inbox, id, true);
            updateLikedCache(queryClient, QUERY_KEYS.postsByAccount, id, true);
            updateLikedCache(queryClient, QUERY_KEYS.postsLikedByAccount, id, true);

            // Update account liked count
            queryClient.setQueryData(QUERY_KEYS.account(handle), (currentAccount?: Account) => {
                if (!currentAccount) {
                    return currentAccount;
                }
                return {
                    ...currentAccount,
                    likedCount: currentAccount.likedCount + 1
                };
            });
        }
    });
}

export function useUnlikeMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.unlike(id);
        },
        onMutate: (id) => {
            updateLikedCache(queryClient, QUERY_KEYS.feed, id, false);
            updateLikedCache(queryClient, QUERY_KEYS.inbox, id, false);
            updateLikedCache(queryClient, QUERY_KEYS.postsByAccount, id, false);
            updateLikedCache(queryClient, QUERY_KEYS.postsLikedByAccount, id, false);

            // Update account liked count
            queryClient.setQueryData(QUERY_KEYS.account(handle), (currentAccount?: Account) => {
                if (!currentAccount) {
                    return currentAccount;
                }
                return {
                    ...currentAccount,
                    likedCount: Math.max(0, currentAccount.likedCount - 1)
                };
            });
        }
    });
}

function updateRepostCache(queryClient: QueryClient, queryKey: string[], id: string, reposted: boolean) {
    queryClient.setQueriesData(queryKey, (current?: {pages: {posts: Activity[]}[]}) => {
        if (current === undefined) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page: {posts: Activity[]}) => {
                return {
                    ...page,
                    posts: page.posts.map((item: Activity) => {
                        if (item.object.id === id) {
                            return {
                                ...item,
                                object: {
                                    ...item.object,
                                    reposted: reposted,
                                    repostCount: Math.max(reposted ? item.object.repostCount + 1 : item.object.repostCount - 1, 0)
                                }
                            };
                        }

                        return item;
                    })
                };
            })
        };
    });
}

export function useRepostMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.repost(id);
        },
        onMutate: (id) => {
            updateRepostCache(queryClient, QUERY_KEYS.feed, id, true);
            updateRepostCache(queryClient, QUERY_KEYS.inbox, id, true);
        }
    });
}

export function useDerepostMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(id: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.derepost(id);
        },
        onMutate: (id) => {
            updateRepostCache(queryClient, QUERY_KEYS.feed, id, false);
            updateRepostCache(queryClient, QUERY_KEYS.inbox, id, false);
        }
    });
}

export function useUserDataForUser(handle: string) {
    return useQuery({
        queryKey: QUERY_KEYS.user(handle),
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getUser();
        }
    });
}

export function useUnfollowMutationForUser(handle: string, onSuccess: () => void, onError: () => void) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(username: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.unfollow(username);
        },
        onSuccess(_, fullHandle) {
            // Update the "isFollowing" and "followerCount" properties of the profile being unfollowed
            const profileQueryKey = QUERY_KEYS.account(fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile?: {followedByMe: boolean, followerCount: number}) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    followedByMe: false,
                    followerCount: currentProfile.followerCount - 1 < 0 ? 0 : currentProfile.followerCount - 1
                };
            });

            // Update the profile followers query cache for the profile being unfollowed
            const profileFollowersQueryKey = QUERY_KEYS.profileFollowers(fullHandle);

            queryClient.setQueryData(profileFollowersQueryKey, (oldData?: {
                pages: Array<{
                    followers: Array<{
                        actor: {
                            id: string;
                            type: string;
                            preferredUsername: string;
                            name: string;
                            url: string;
                            icon: {
                                type: string;
                                url: string;
                            };
                        };
                        isFollowing: boolean;
                    }>;
                }>;
            }) => {
                if (!oldData?.pages?.[0]) {
                    return oldData;
                }

                const currentAccount = queryClient.getQueryData<Account>(QUERY_KEYS.account('me'));
                if (!currentAccount) {
                    return oldData;
                }

                return {
                    ...oldData,
                    pages: oldData.pages.map((page: {
                        followers: Array<{
                            actor: {
                                id: string;
                                type: string;
                                preferredUsername: string;
                                name: string;
                                url: string;
                                icon: {
                                    type: string;
                                    url: string;
                                };
                            };
                            isFollowing: boolean;
                        }>;
                    }) => ({
                        ...page,
                        followers: page.followers.filter((follower: {
                            actor: {
                                id: string;
                                type: string;
                                preferredUsername: string;
                                name: string;
                                url: string;
                                icon: {
                                    type: string;
                                    url: string;
                                };
                            };
                            isFollowing: boolean;
                        }) => follower.actor.name !== currentAccount.name)
                    }))
                };
            });

            // Update the "followingCount" property of the account performing the follow
            const accountQueryKey = QUERY_KEYS.account('me');

            queryClient.setQueryData(accountQueryKey, (currentAccount?: { followingCount: number }) => {
                if (!currentAccount) {
                    return currentAccount;
                }

                return {
                    ...currentAccount,
                    followingCount: currentAccount.followingCount - 1
                };
            });

            // Remove the unfollowed actor from the follows query cache for the account performing the unfollow
            const accountFollowsQueryKey = QUERY_KEYS.accountFollows('index', 'following');

            queryClient.setQueryData(accountFollowsQueryKey, (currentFollows?: {pages: {accounts: FollowAccount[]}[]}) => {
                if (!currentFollows) {
                    return currentFollows;
                }

                return {
                    ...currentFollows,
                    pages: currentFollows.pages.map(page => ({
                        ...page,
                        data: page.accounts.filter(account => account.handle !== fullHandle)
                    }))
                };
            });

            onSuccess();
        },
        onError
    });
}

export function useFollowMutationForUser(handle: string, onSuccess: () => void, onError: () => void) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(username: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.follow(username);
        },
        onSuccess(_, fullHandle) {
            // Update the "isFollowing" and "followerCount" properties of the profile being followed
            const profileQueryKey = QUERY_KEYS.account(fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile?: {followedByMe: boolean, followerCount: number}) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    followedByMe: true,
                    followerCount: currentProfile.followerCount + 1
                };
            });

            // Update the "followingCount" property of the account performing the follow
            const accountQueryKey = QUERY_KEYS.account('me');

            queryClient.setQueryData(accountQueryKey, (currentAccount?: { followingCount: number }) => {
                if (!currentAccount) {
                    return currentAccount;
                }

                return {
                    ...currentAccount,
                    followingCount: currentAccount.followingCount + 1
                };
            });

            const profileFollowersQueryKey = QUERY_KEYS.profileFollowers(fullHandle);

            // Invalidate the follows query cache for the account performing the follow
            // because we cannot directly add to it due to potentially incompatible data
            // shapes
            const accountFollowsQueryKey = QUERY_KEYS.accountFollows('index', 'following');

            queryClient.invalidateQueries({queryKey: accountFollowsQueryKey});

            // Add new follower to the followers list cache
            queryClient.setQueryData(profileFollowersQueryKey, (oldData?: {
                pages: Array<{
                    followers: Array<{
                        actor: {
                            id: string;
                            type: string;
                            preferredUsername: string;
                            name: string;
                            url: string;
                            icon: {
                                type: string;
                                url: string;
                            };
                        };
                        isFollowing: boolean;
                    }>;
                }>;
            }) => {
                if (!oldData?.pages?.[0]) {
                    return oldData;
                }

                const currentAccount = queryClient.getQueryData<Account>(QUERY_KEYS.account('me'));
                if (!currentAccount) {
                    return oldData;
                }

                const newFollower = {
                    actor: {
                        id: currentAccount.url,
                        type: 'Person',
                        preferredUsername: 'index',
                        name: currentAccount.name,
                        url: currentAccount.url,
                        icon: {
                            type: 'Image',
                            url: currentAccount.avatarUrl
                        }
                    },
                    isFollowing: false
                };

                return {
                    ...oldData,
                    pages: [{
                        ...oldData.pages[0],
                        followers: [newFollower, ...oldData.pages[0].followers]
                    }, ...oldData.pages.slice(1)]
                };
            });

            onSuccess();
        },
        onError
    });
}

export function useSearchForUser(handle: string, query: string) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.searchResults(query);

    const searchQuery = useQuery({
        queryKey,
        enabled: query.length > 0,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.search(query);
        }
    });

    const updateAccountSearchResult = (id: string, updated: Partial<AccountSearchResult>) => {
        // Update the account search result stored in the search results query cache
        queryClient.setQueryData(queryKey, (current: SearchResults | undefined) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                accounts: current.accounts.map((item: AccountSearchResult) => {
                    if (item.id === id) {
                        return {...item, ...updated};
                    }

                    return item;
                })
            };
        });
    };

    return {searchQuery, updateAccountSearchResult};
}

export function useExploreProfilesForUser(handle: string) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.exploreProfiles(handle);

    const fetchExploreProfiles = useCallback(async ({pageParam = 0}: {pageParam?: number}) => {
        const siteUrl = await getSiteUrl();
        const api = createActivityPubAPI(handle, siteUrl);

        // Collect all handles with their category info
        const allHandles = Object.entries(exploreSites).flatMap(([key, category]) => category.sites.map(profileHandle => ({
            key,
            categoryName: category.categoryName,
            profileHandle
        })));

        // Calculate pagination
        const pageSize = 10; // Number of profiles per page
        const startIndex = pageParam * pageSize;
        const endIndex = startIndex + pageSize;

        // Ensure we don't go beyond the total number of handles
        if (startIndex >= allHandles.length) {
            return {
                results: {},
                nextPage: undefined
            };
        }

        const paginatedHandles = allHandles.slice(startIndex, endIndex);

        // Fetch profiles for current page
        const allResults = await Promise.allSettled(
            paginatedHandles.map(item => api.getAccount(item.profileHandle)
                .then(profile => ({...item, profile}))
            )
        );

        // Organize results back into categories
        const results: Record<string, { categoryName: string; sites: Account[] }> = {};

        allResults
            .filter((result): result is PromiseFulfilledResult<typeof allHandles[0] & { profile: Account }> => result.status === 'fulfilled'
            )
            .forEach((result) => {
                const {key, categoryName, profile} = result.value;

                if (!results[key]) {
                    results[key] = {categoryName, sites: []};
                }

                results[key].sites.push(profile);
            });

        return {
            results,
            nextPage: endIndex < allHandles.length ? pageParam + 1 : undefined
        };
    }, [handle]);

    const exploreProfilesQuery = useInfiniteQuery({
        queryKey,
        queryFn: ({pageParam = 0}) => fetchExploreProfiles({pageParam}),
        getNextPageParam: lastPage => lastPage.nextPage
    });

    const updateExploreProfile = (id: string, updated: Partial<Account>) => {
        queryClient.setQueryData(queryKey, (current: {pages: Array<{results: Record<string, { categoryName: string; sites: Account[] }>}>} | undefined) => {
            if (!current) {
                return current;
            }

            // Create a new pages array with updated profiles
            const updatedPages = current.pages.map((page) => {
                // Create a new results object with updated categories
                const updatedResults = Object.entries(page.results).reduce((acc, [categoryKey, category]) => {
                    // Update the sites array for this category
                    const updatedSites = category.sites.map((profile) => {
                        if (profile.id === id) {
                            return {...profile, ...updated};
                        }
                        return profile;
                    });

                    // Add the updated category to the results
                    acc[categoryKey] = {
                        ...category,
                        sites: updatedSites
                    };

                    return acc;
                }, {} as Record<string, { categoryName: string; sites: Account[] }>);

                return {
                    ...page,
                    results: updatedResults
                };
            });

            return {
                ...current,
                pages: updatedPages
            };
        });
    };

    return {
        exploreProfilesQuery,
        updateExploreProfile
    };
}

export function useSuggestedProfilesForUser(handle: string, limit = 3) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.suggestedProfiles(handle, limit);

    const suggestedHandles = Object.values(exploreSites).flatMap(category => category.sites);

    const suggestedProfilesQuery = useQuery({
        queryKey,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return Promise.allSettled(
                suggestedHandles
                    .sort(() => Math.random() - 0.5)
                    .slice(0, limit)
                    .map(suggestedHandle => api.getAccount(suggestedHandle))
            ).then((results) => {
                return results
                    .filter((result): result is PromiseFulfilledResult<Account> => result.status === 'fulfilled')
                    .map(result => result.value);
            });
        }
    });

    const updateSuggestedProfile = (id: string, updated: Partial<Account>) => {
        // Update the suggested profiles stored in the suggested profiles query cache
        queryClient.setQueryData(queryKey, (current: Account[] | undefined) => {
            if (!current) {
                return current;
            }

            return current.map((item: Account) => {
                if (item.id === id) {
                    return {...item, ...updated};
                }

                return item;
            });
        });
    };

    return {suggestedProfilesQuery, updateSuggestedProfile};
}

export function useProfilePostsForUser(handle: string, profileHandle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.profilePosts(profileHandle),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getProfilePosts(profileHandle, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useProfileFollowersForUser(handle: string, profileHandle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.profileFollowers(profileHandle),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getProfileFollowers(profileHandle, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useProfileFollowingForUser(handle: string, profileHandle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.profileFollowing(profileHandle),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getProfileFollowing(profileHandle, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useThreadForUser(handle: string, id?: string) {
    return useQuery({
        queryKey: QUERY_KEYS.thread(id || ''),
        refetchOnMount: 'always',
        enabled: Boolean(id),
        async queryFn() {
            if (!id) {
                throw new Error('Post ID is required');
            }

            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getThread(id).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity)
                };
            });
        }
    });
}

function prependActivityToPaginatedCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts' | 'data',
    activity: Activity
) {
    queryClient.setQueryData(queryKey, (current: {
        pages: Array<{
            [key: string]: Activity[]
        }>
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page, idx: number) => {
                if (idx === 0) {
                    return {
                        ...page,
                        [collection]: [activity, ...page[collection]]
                    };
                }
                return page;
            })
        };
    });
}

function addActivityToCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts',
    activity: Activity,
    after?: string
) {
    queryClient.setQueryData(queryKey, (current: {
        [key: string]: Activity[]
    } | undefined) => {
        if (!current) {
            return current;
        }

        let afterIdx = 0;

        if (after) {
            afterIdx = current[collection].findIndex(item => item.id === after);

            if (afterIdx === -1) {
                return current;
            }
        }

        return {
            ...current,
            [collection]: [
                ...current[collection].slice(0, afterIdx + 1),
                activity,
                ...current[collection].slice(afterIdx + 1)
            ]
        };
    });
}

function updateActivityInPaginatedCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts' | 'data',
    id: string,
    update: (activity: Activity) => Activity
) {
    queryClient.setQueryData(queryKey, (current: {
        pages: Array<{
            [key: string]: Activity[]
        }>
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page) => {
                return {
                    ...page,
                    [collection]: page[collection].map((item: Activity) => {
                        if (item.id === id) {
                            return update(item);
                        }
                        return item;
                    })
                };
            })
        };
    });
}

function updateActivityInCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts',
    id: string,
    update: (activity: Activity) => Activity
) {
    queryClient.setQueryData(queryKey, (current: {
        [key: string]: Activity[]
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            [collection]: current[collection].map((item: Activity) => {
                if (item.id === id) {
                    return update(item);
                }
                return item;
            })
        };
    });
}

function removeActivityFromPaginatedCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts' | 'data',
    id: string
) {
    queryClient.setQueryData(queryKey, (current: {
        pages: Array<{
            [key: string]: Activity[]
        }>
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page) => {
                return {
                    ...page,
                    [collection]: page[collection].filter(item => item.id !== id)
                };
            })
        };
    });
}

function removeActivityFromCollection(
    queryClient: QueryClient,
    queryKey: string[],
    collection: 'posts',
    id: string
) {
    queryClient.setQueryData(queryKey, (current: {
        [key: string]: Activity[]
    } | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            [collection]: current[collection].filter((item: Activity) => item.id !== id)
        };
    });
}

function prepareNewActivity(activity: Activity) {
    return {
        ...activity,
        // Update the id of the activity to the id of the activity object
        // as this is the id that will be used to perform actions on the
        // activity (i.e like, delete, etc)
        id: activity.object.id,
        object: {
            ...activity.object,
            // Set the authored flag to true as we know this is an activity created
            // by the user but the returned activity object does not have this
            // flag set
            authored: true,
            // Set the URL property to be the id of the object as this is not
            // included in the object returned from the API
            url: activity.object.id,
            // Set the replyCount property to 0 so that it can be incremented
            replyCount: 0
        }
    };
}

export function useReplyMutationForUser(handle: string, actorProps?: ActorProperties) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn({inReplyTo, content}: {inReplyTo: string, content: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.reply(inReplyTo, content);
        },
        onMutate: ({inReplyTo, content}) => {
            if (!actorProps) {
                throw new Error('Cannot create reply without actor props');
            }

            const formattedContent = formatPendingActivityContent(content);

            const id = generatePendingActivityId();
            const activity = generatePendingActivity(actorProps, id, formattedContent);

            // Add pending activity to the thread after the inReplyTo post
            addActivityToCollection(queryClient, QUERY_KEYS.thread(inReplyTo), 'posts', activity, inReplyTo);

            // Increment the reply count of the inReplyTo post in the feed
            updateReplyCountInCache(queryClient, inReplyTo, 1);

            // We do not need to increment the reply count of the inReplyTo post
            // in the thread as this is handled locally in the ArticleModal component

            return {id};
        },
        onSuccess: (activity: Activity, variables, context) => {
            if (activity.id === undefined) {
                throw new Error('Activity returned from API has no id');
            }

            const preparedActivity = prepareNewActivity(activity);

            updateActivityInCollection(queryClient, QUERY_KEYS.thread(variables.inReplyTo), 'posts', context?.id ?? '', () => preparedActivity);
        },
        onError: (error, variables, context) => {
            // eslint-disable-next-line no-console
            console.error(error);

            // Remove the pending activity from the thread
            removeActivityFromCollection(queryClient, QUERY_KEYS.thread(variables.inReplyTo), 'posts', context?.id ?? '');

            // Decrement the reply count of the inReplyTo post in the feed
            updateReplyCountInCache(queryClient, variables.inReplyTo, -1);

            // We do not need to decrement the reply count of the inReplyTo post
            // in the thread as this is handled locally in the ArticleModal component

            showToast({
                message: 'An error occurred while sending your reply.',
                type: 'error'
            });
        }
    });
}

export function useNoteMutationForUser(handle: string, actorProps?: ActorProperties) {
    const queryClient = useQueryClient();
    const queryKeyFeed = QUERY_KEYS.feed;
    const queryKeyOutbox = QUERY_KEYS.outbox(handle);
    const queryKeyPostsByAccount = QUERY_KEYS.postsByAccount;

    return useMutation({
        async mutationFn(content: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.note(content);
        },
        onMutate: (content: string) => {
            if (!actorProps) {
                throw new Error('Cannot create note without actor props');
            }

            const formattedContent = formatPendingActivityContent(content);

            const id = generatePendingActivityId();
            const activity = generatePendingActivity(actorProps, id, formattedContent);

            prependActivityToPaginatedCollection(queryClient, queryKeyFeed, 'posts', activity);
            prependActivityToPaginatedCollection(queryClient, queryKeyOutbox, 'data', activity);

            // Add to profile tab (postsByAccount)
            prependActivityToPaginatedCollection(queryClient, queryKeyPostsByAccount, 'posts', activity);

            return {id};
        },
        onSuccess: (activity: Activity, _variables, context) => {
            if (activity.id === undefined) {
                throw new Error('Activity returned from API has no id');
            }

            const preparedActivity = prepareNewActivity(activity);

            updateActivityInPaginatedCollection(queryClient, queryKeyFeed, 'posts', context?.id ?? '', () => preparedActivity);
            updateActivityInPaginatedCollection(queryClient, queryKeyOutbox, 'data', context?.id ?? '', () => preparedActivity);
            updateActivityInPaginatedCollection(queryClient, queryKeyPostsByAccount, 'posts', context?.id ?? '', () => preparedActivity);
        },
        onError(error, _variables, context) {
            // eslint-disable-next-line no-console
            console.error(error);

            removeActivityFromPaginatedCollection(queryClient, queryKeyFeed, 'posts', context?.id ?? '');
            removeActivityFromPaginatedCollection(queryClient, queryKeyOutbox, 'data', context?.id ?? '');
            removeActivityFromPaginatedCollection(queryClient, queryKeyPostsByAccount, 'posts', context?.id ?? '');

            showToast({
                message: 'An error occurred while posting your note.',
                type: 'error'
            });
        }
    });
}

export function useAccountForUser(handle: string, profileHandle: string) {
    return useQuery({
        queryKey: QUERY_KEYS.account(profileHandle),
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getAccount(profileHandle);
        }
    });
}

export function useAccountFollowsForUser(handle: string, type: AccountFollowsType) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.accountFollows(handle, type),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getAccountFollows(type, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useFeedForUser(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.feed;
    const queryClient = useQueryClient();

    const feedQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        staleTime: 1 * 60 * 1000, // 1m
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getFeed(pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updateFeedActivity = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {feedQuery, updateFeedActivity};
}

export function useInboxForUser(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.inbox;
    const queryClient = useQueryClient();

    const inboxQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        staleTime: 20 * 1000, // 20s
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getInbox(pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updateInboxActivity = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {inboxQuery, updateInboxActivity};
}

export function usePostsByAccount(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.postsByAccount;
    const queryClient = useQueryClient();

    const postsByAccountQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getPostsByAccount(pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updatePostsByAccount = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {postsByAccountQuery, updatePostsByAccount};
}

export function usePostsLikedByAccount(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.postsLikedByAccount;
    const queryClient = useQueryClient();

    const postsLikedByAccountQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);
            return api.getPostsLikedByAccount(pageParam).then((response) => {
                return {
                    posts: response.posts.map(mapPostToActivity),
                    next: response.next
                };
            });
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updatePostsLikedByAccount = (id: string, updated: Partial<Activity>) => {
        updateActivityInPaginatedCollection(
            queryClient,
            queryKey,
            'posts',
            id,
            activity => ({...activity, ...updated})
        );
    };

    return {postsLikedByAccountQuery, updatePostsLikedByAccount};
}

export function useDeleteMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn(mutationData: {id: string, parentId?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.delete(mutationData.id);
        },
        onMutate: ({id, parentId}) => {
            // Update the feed cache:
            // - Remove the post from the feed
            // - Decrement the reply count of the parent post if applicable
            const previousFeed = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(QUERY_KEYS.feed);

            queryClient.setQueryData(QUERY_KEYS.feed, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => {
                        return {
                            ...page,
                            posts: page.posts
                                .filter((item: Activity) => item.id !== id)
                                .map((item: Activity) => {
                                    if (item.object.id === parentId) {
                                        return {
                                            ...item,
                                            object: {
                                                ...item.object,
                                                replyCount: item.object.replyCount - 1
                                            }
                                        };
                                    }
                                    return item;
                                })
                        };
                    })
                };
            });

            // Update the inbox cache:
            // - Remove the post from the inbox
            // - Decrement the reply count of the parent post if applicable
            const previousInbox = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(QUERY_KEYS.inbox);

            queryClient.setQueryData(QUERY_KEYS.inbox, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => {
                        return {
                            ...page,
                            posts: page.posts
                                .filter((item: Activity) => item.id !== id)
                                .map((item: Activity) => {
                                    if (item.object.id === parentId) {
                                        return {
                                            ...item,
                                            object: {
                                                ...item.object,
                                                replyCount: item.object.replyCount - 1
                                            }
                                        };
                                    }
                                    return item;
                                })
                        };
                    })
                };
            });

            // Update the thread cache:
            // - Remove the post from the thread
            // - Decrement the reply count of the parent post if applicable
            const threadQueryKey = QUERY_KEYS.thread(null);
            const previousThreads = queryClient.getQueriesData<{posts: Activity[]}>(threadQueryKey);

            queryClient.setQueriesData(threadQueryKey, (current?: {posts: Activity[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    posts: current.posts.filter((activity: Activity) => activity.id !== id)
                        .map((activity: Activity) => {
                            if (activity.object.id === parentId) {
                                return {
                                    ...activity,
                                    object: {
                                        ...activity.object,
                                        replyCount: activity.object.replyCount - 1
                                    }
                                };
                            }
                            return activity;
                        })
                };
            });

            // Update the outbox cache:
            // - Remove the post from the outbox
            const outboxQueryKey = QUERY_KEYS.outbox(handle);
            const previousOutbox = queryClient.getQueryData<{pages: {data: Activity[]}[]}>(outboxQueryKey);

            queryClient.setQueryData(outboxQueryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        return {
                            ...page,
                            data: page.data.filter((item: Activity) => item.object.id !== id)
                        };
                    })
                };
            });

            // Update the liked cache:
            // - Remove the post from the liked collection
            const likedQueryKey = QUERY_KEYS.liked(handle);
            const previousLiked = queryClient.getQueryData<{pages: {data: Activity[]}[]}>(likedQueryKey);
            let removedFromLiked = false;

            queryClient.setQueryData(likedQueryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        removedFromLiked = page.data.some((item: Activity) => item.object.id === id);

                        return {
                            ...page,
                            data: page.data.filter((item: Activity) => item.object.id !== id)
                        };
                    })
                };
            });

            // Check if post was liked by checking all possible locations
            const wasLiked = [
                QUERY_KEYS.feed,
                QUERY_KEYS.inbox,
                QUERY_KEYS.postsByAccount,
                QUERY_KEYS.postsLikedByAccount
            ].some((key) => {
                const queryData = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(key);
                return queryData?.pages.some(page => page.posts.some(post => post.id === id && post.object.liked));
            });

            if (wasLiked) {
                queryClient.setQueryData(QUERY_KEYS.account(handle), (currentAccount?: Account) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }
                    return {
                        ...currentAccount,
                        likedCount: Math.max(0, currentAccount.likedCount - 1)
                    };
                });
            }

            // Update the profile posts cache:
            // - Remove the post from any profile posts collections it may be in
            const profilePostsQueryKey = QUERY_KEYS.profilePosts(null);
            const previousProfilePosts = queryClient.getQueriesData<{pages: {posts: Activity[]}[]}>(profilePostsQueryKey);

            queryClient.setQueriesData(profilePostsQueryKey, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => {
                        return {
                            ...page,
                            posts: page.posts.filter((item: Activity) => item.object.id !== id)
                        };
                    })
                };
            });

            // Update the account cache:
            // - Decrement liked post count if the removed post was in the liked collection
            let accountQueryKey: string[] = [];
            let previousAccount: Account | undefined;

            if (removedFromLiked) {
                accountQueryKey = QUERY_KEYS.account(handle);
                previousAccount = queryClient.getQueryData<Account>(accountQueryKey);

                queryClient.setQueryData(accountQueryKey, (currentAccount?: {likedCount: number}) => {
                    if (!currentAccount) {
                        return currentAccount;
                    }

                    return {
                        ...currentAccount,
                        likedCount: currentAccount.likedCount - 1 < 0 ? 0 : currentAccount.likedCount - 1
                    };
                });
            }

            // Update the posts by account cache
            const postsByAccountKey = QUERY_KEYS.postsByAccount;
            const previousPostsByAccount = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(postsByAccountKey);

            queryClient.setQueryData(postsByAccountKey, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => ({
                        ...page,
                        posts: page.posts.filter((item: Activity) => item.object.id !== id)
                    }))
                };
            });

            // Update the liked posts cache
            const postsLikedByAccountKey = QUERY_KEYS.postsLikedByAccount;
            const previousPostsLikedByAccount = queryClient.getQueryData<{pages: {posts: Activity[]}[]}>(postsLikedByAccountKey);

            queryClient.setQueryData(postsLikedByAccountKey, (current?: {pages: {posts: Activity[]}[]}) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {posts: Activity[]}) => ({
                        ...page,
                        posts: page.posts.filter((item: Activity) => item.object.id !== id)
                    }))
                };
            });

            return {
                previousFeed: {
                    key: QUERY_KEYS.feed,
                    data: previousFeed
                },
                previousInbox: {
                    key: QUERY_KEYS.inbox,
                    data: previousInbox
                },
                previousThreads: {
                    key: threadQueryKey,
                    data: previousThreads
                },
                previousOutbox: {
                    key: outboxQueryKey,
                    data: previousOutbox
                },
                previousLiked: {
                    key: likedQueryKey,
                    data: previousLiked
                },
                previousProfilePosts: {
                    key: profilePostsQueryKey,
                    data: previousProfilePosts
                },
                previousAccount: removedFromLiked ? {
                    key: accountQueryKey,
                    data: previousAccount
                } : null,
                previousPostsByAccount: {
                    key: QUERY_KEYS.postsByAccount,
                    data: previousPostsByAccount
                },
                previousPostsLikedByAccount: {
                    key: QUERY_KEYS.postsLikedByAccount,
                    data: previousPostsLikedByAccount
                }
            };
        },
        onError: (_err, _variables, context) => {
            if (!context) {
                return;
            }

            queryClient.setQueryData(context.previousFeed.key, context.previousFeed.data);
            queryClient.setQueryData(context.previousInbox.key, context.previousInbox.data);
            queryClient.setQueriesData(context.previousThreads.key, context.previousThreads.data);
            queryClient.setQueryData(context.previousOutbox.key, context.previousOutbox.data);
            queryClient.setQueryData(context.previousLiked.key, context.previousLiked.data);
            queryClient.setQueriesData(context.previousProfilePosts.key, context.previousProfilePosts.data);

            if (context.previousAccount) {
                queryClient.setQueryData(context.previousAccount.key, context.previousAccount.data);
            }

            if (context.previousPostsByAccount) {
                queryClient.setQueryData(QUERY_KEYS.postsByAccount, context.previousPostsByAccount);
            }
            if (context.previousPostsLikedByAccount) {
                queryClient.setQueryData(QUERY_KEYS.postsLikedByAccount, context.previousPostsLikedByAccount);
            }
        }
    });
}

export function useNotificationsForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.notifications(handle),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getNotifications(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function usePostForUser(handle: string, id: string | null) {
    return useQuery({
        queryKey: QUERY_KEYS.post(id || ''),
        refetchOnMount: 'always',
        enabled: Boolean(id),
        async queryFn() {
            if (!id) {
                throw new Error('Post ID is required');
            }

            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getPost(id).then((response) => {
                return mapPostToActivity(response);
            });
        }
    });
}
