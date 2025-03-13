import {
    type Account,
    type AccountFollowsType,
    type AccountSearchResult,
    ActivityPubAPI,
    ActivityPubCollectionResponse,
    FollowAccount,
    type GetAccountFollowsResponse,
    type Profile,
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
import {formatPendingActivityContent, generatePendingActivity, generatePendingActivityId} from '../utils/pending-activity';
import {mapPostToActivity} from '../utils/posts';
import {showToast} from '@tryghost/admin-x-design-system';

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
    profile: (handle: string) => ['profile', handle],
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
    activities: (
        handle: string,
        key?: string | null,
        options?: {
            includeOwn?: boolean,
            includeReplies?: boolean,
            filter?: {type?: string[]} | null,
            limit?: number,
        }
    ) => ['activities', handle, key, options].filter(value => value !== undefined),
    searchResults: (query: string) => ['search_results', query],
    suggestedProfiles: (limit: number) => ['suggested_profiles', limit],
    thread: (id: string | null) => {
        if (id === null) {
            return ['thread'];
        }
        return ['thread', id];
    },
    feed: ['feed'],
    inbox: ['inbox'],
    postsByAccount: ['posts_by_account'],
    postsLikedByAccount: ['posts_liked_by_account']
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
            const profileQueryKey = QUERY_KEYS.profile(fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile?: {isFollowing: boolean, followerCount: number}) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    isFollowing: false,
                    followerCount: currentProfile.followerCount - 1 < 0 ? 0 : currentProfile.followerCount - 1
                };
            });

            // Invalidate the profile followers query cache for the profile being unfollowed
            // because we cannot directly remove from it as we don't have the data for the unfollowed follower
            const profileFollowersQueryKey = QUERY_KEYS.profileFollowers(fullHandle);

            queryClient.invalidateQueries({queryKey: profileFollowersQueryKey});

            // Update the "followingCount" property of the account performing the follow
            const accountQueryKey = QUERY_KEYS.account('index');

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
            const profileQueryKey = QUERY_KEYS.profile(fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile?: {isFollowing: boolean, followerCount: number}) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    isFollowing: true,
                    followerCount: currentProfile.followerCount + 1
                };
            });

            // Invalidate the profile followers query cache for the profile being followed
            // because we cannot directly add to it as we don't have the data for the new follower
            const profileFollowersQueryKey = QUERY_KEYS.profileFollowers(fullHandle);

            queryClient.invalidateQueries({queryKey: profileFollowersQueryKey});

            // Update the "followingCount" property of the account performing the follow
            const accountQueryKey = QUERY_KEYS.account('index');

            queryClient.setQueryData(accountQueryKey, (currentAccount?: { followingCount: number }) => {
                if (!currentAccount) {
                    return currentAccount;
                }

                return {
                    ...currentAccount,
                    followingCount: currentAccount.followingCount + 1
                };
            });

            // Invalidate the follows query cache for the account performing the follow
            // because we cannot directly add to it due to potentially incompatible data
            // shapes
            const accountFollowsQueryKey = QUERY_KEYS.accountFollows('index', 'following');

            queryClient.invalidateQueries({queryKey: accountFollowsQueryKey});

            onSuccess();
        },
        onError
    });
}

export const GET_ACTIVITIES_QUERY_KEY_INBOX = 'inbox';
export const GET_ACTIVITIES_QUERY_KEY_FEED = 'feed';
export const GET_ACTIVITIES_QUERY_KEY_NOTIFICATIONS = 'notifications';

export function useActivitiesForUser({
    handle,
    includeOwn = false,
    includeReplies = false,
    filter = null,
    limit = undefined,
    key = null
}: {
    handle: string;
    includeOwn?: boolean;
    includeReplies?: boolean;
    filter?: {type?: string[]} | null;
    limit?: number;
    key?: string | null;
}) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.activities(handle, key, {includeOwn, includeReplies, filter});

    const getActivitiesQuery = useInfiniteQuery({
        queryKey,
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getActivities(includeOwn, includeReplies, filter, limit, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });

    const updateActivity = (id: string, updated: Partial<Activity>) => {
        // Update the activity stored in the activities query cache
        queryClient.setQueryData(queryKey, (current: {pages: {data: Activity[]}[]} | undefined) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                pages: current.pages.map((page: {data: Activity[]}) => {
                    return {
                        ...page,
                        data: page.data.map((item: Activity) => {
                            if (item.id === id) {
                                return {...item, ...updated};
                            }

                            return item;
                        })
                    };
                })
            };
        });
    };

    return {getActivitiesQuery, updateActivity};
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

export function useSuggestedProfilesForUser(handle: string, limit = 3) {
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.suggestedProfiles(limit);

    const suggestedHandles = [
        '@index@activitypub.ghost.org',
        '@index@john.onolan.org',
        '@index@www.coffeeandcomplexity.com',
        '@index@ghost.codenamejimmy.com',
        '@index@www.syphoncontinuity.com',
        '@index@www.cosmico.org',
        '@index@silverhuang.com'
    ];

    const suggestedProfilesQuery = useQuery({
        queryKey,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return Promise.allSettled(
                suggestedHandles
                    .sort(() => Math.random() - 0.5)
                    .slice(0, limit)
                    .map(suggestedHandle => api.getProfile(suggestedHandle))
            ).then((results) => {
                return results
                    .filter((result): result is PromiseFulfilledResult<Profile> => result.status === 'fulfilled')
                    .map(result => result.value);
            });
        }
    });

    const updateSuggestedProfile = (id: string, updated: Partial<Profile>) => {
        // Update the suggested profiles stored in the suggested profiles query cache
        queryClient.setQueryData(queryKey, (current: Profile[] | undefined) => {
            if (!current) {
                return current;
            }

            return current.map((item: Profile) => {
                if (item.actor.id === id) {
                    return {...item, ...updated};
                }

                return item;
            });
        });
    };

    return {suggestedProfilesQuery, updateSuggestedProfile};
}

export function useProfileForUser(handle: string, profileHandle: string, enabled: boolean = true) {
    return useQuery({
        queryKey: QUERY_KEYS.profile(profileHandle),
        enabled,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getProfile(profileHandle);
        }
    });
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

export function useThreadForUser(handle: string, id: string) {
    return useQuery({
        queryKey: QUERY_KEYS.thread(id),
        refetchOnMount: 'always',
        async queryFn() {
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
            updateActivityInPaginatedCollection(queryClient, QUERY_KEYS.feed, 'posts', inReplyTo, currentActivity => ({
                ...currentActivity,
                object: {
                    ...currentActivity.object,
                    replyCount: currentActivity.object.replyCount + 1
                }
            }));

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
            updateActivityInPaginatedCollection(queryClient, QUERY_KEYS.feed, 'posts', variables.inReplyTo, currentActivity => ({
                ...currentActivity,
                object: {
                    ...currentActivity.object,
                    replyCount: currentActivity.object.replyCount - 1
                }
            }));

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

            return {id};
        },
        onSuccess: (activity: Activity, _variables, context) => {
            if (activity.id === undefined) {
                throw new Error('Actvitiy returned from API has no id');
            }

            const preparedActivity = prepareNewActivity(activity);

            updateActivityInPaginatedCollection(queryClient, queryKeyFeed, 'posts', context?.id ?? '', () => preparedActivity);
            updateActivityInPaginatedCollection(queryClient, queryKeyOutbox, 'data', context?.id ?? '', () => preparedActivity);
        },
        onError(error, _variables, context) {
            // eslint-disable-next-line no-console
            console.error(error);

            removeActivityFromPaginatedCollection(queryClient, queryKeyFeed, 'posts', context?.id ?? '');
            removeActivityFromPaginatedCollection(queryClient, queryKeyOutbox, 'data', context?.id ?? '');

            showToast({
                message: 'An error occurred while posting your note.',
                type: 'error'
            });
        }
    });
}

export function useAccountForUser(handle: string) {
    return useQuery({
        queryKey: QUERY_KEYS.account(handle),
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getAccount();
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

function updateActivityInCache(queryClient: QueryClient, queryKey: unknown[], id: string, updated: Partial<Activity>) {
    queryClient.setQueryData(queryKey, (current: {pages: {posts: Activity[]}[]} | undefined) => {
        if (!current) {
            return current;
        }

        return {
            ...current,
            pages: current.pages.map((page: {posts: Activity[]}) => {
                return {
                    ...page,
                    posts: page.posts.map((item: Activity) => {
                        if (item.id === id) {
                            return {...item, ...updated};
                        }
                        return item;
                    })
                };
            })
        };
    });
}

export function useFeedForUser(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.feed;
    const queryClient = useQueryClient();

    const feedQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
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
        updateActivityInCache(queryClient, queryKey, id, updated);
    };

    return {feedQuery, updateFeedActivity};
}

export function useInboxForUser(options: {enabled: boolean}) {
    const queryKey = QUERY_KEYS.inbox;
    const queryClient = useQueryClient();

    const inboxQuery = useInfiniteQuery({
        queryKey,
        enabled: options.enabled,
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
        updateActivityInCache(queryClient, queryKey, id, updated);
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
        updateActivityInCache(queryClient, queryKey, id, updated);
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
        updateActivityInCache(queryClient, queryKey, id, updated);
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
