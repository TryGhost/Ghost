import {
    type AccountFollowsType,
    type AccountSearchResult,
    ActivityPubAPI,
    ActivityPubCollectionResponse,
    ActivityThread,
    Actor,
    FollowAccount,
    type GetAccountFollowsResponse,
    type Profile,
    type SearchResults
} from '../api/activitypub';
import {Activity} from '../components/activities/ActivityItem';
import {
    type UseInfiniteQueryResult,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient
} from '@tanstack/react-query';

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
    profilePosts: (profileHandle: string) => ['profile_posts', profileHandle],
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
    thread: (id: string) => ['thread', id]
};

export function useOutboxForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.outbox(handle),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getOutbox(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useLikedForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: QUERY_KEYS.liked(handle),
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getLiked(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
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
            // Update the "liked" property of the activity stored in the activities query cache
            const queryKey = QUERY_KEYS.activities(handle);

            queryClient.setQueriesData(queryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (current === undefined) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        return {
                            ...page,
                            data: page.data.map((item: Activity) => {
                                if (item.object.id === id) {
                                    return {
                                        ...item,
                                        object: {
                                            ...item.object,
                                            liked: true
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
            // Update the "liked" property of the activity stored in the activities query cache
            const queryKey = QUERY_KEYS.activities(handle);

            queryClient.setQueriesData(queryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (current === undefined) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        return {
                            ...page,
                            data: page.data.map((item: Activity) => {
                                if (item.object.id === id) {
                                    return {
                                        ...item,
                                        object: {
                                            ...item.object,
                                            liked: false
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
            // Update the "reposted" property of the activity stored in the activities query cache
            const queryKey = QUERY_KEYS.activities(handle);

            queryClient.setQueriesData(queryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (current === undefined) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        return {
                            ...page,
                            data: page.data.map((item: Activity) => {
                                if (item.object.id === id) {
                                    return {
                                        ...item,
                                        object: {
                                            ...item.object,
                                            reposted: true,
                                            repostCount: item.object.repostCount + 1
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
            // Update the "reposted" property of the activity stored in the activities query cache
            const queryKey = QUERY_KEYS.activities(handle);

            queryClient.setQueriesData(queryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (current === undefined) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}) => {
                        return {
                            ...page,
                            data: page.data.map((item: Activity) => {
                                if (item.object.id === id) {
                                    return {
                                        ...item,
                                        object: {
                                            ...item.object,
                                            reposted: false,
                                            repostCount: item.object.repostCount - 1 < 0 ? 0 : item.object.repostCount - 1
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
        onSuccess(unfollowedActor, fullHandle) {
            // Update the "isFollowing" property of the profile stored in the profile query cache
            const profileQueryKey = QUERY_KEYS.profile(fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile: unknown) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    isFollowing: false
                };
            });

            // Remove the unfollowed actor from the profile following query cache
            const profileFollowingQueryKey = QUERY_KEYS.profileFollowing('index');

            queryClient.setQueryData(profileFollowingQueryKey, (currentFollowing?: Actor[]) => {
                if (!currentFollowing) {
                    return currentFollowing;
                }

                return currentFollowing.filter(item => item.id !== unfollowedActor.id);
            });

            const accountFollowsQueryKey = QUERY_KEYS.accountFollows('index', 'following');

            // Remove the unfollowed actor from the account follows query cache
            queryClient.setQueryData(accountFollowsQueryKey, (currentFollows?: FollowAccount[]) => {
                if (!currentFollows) {
                    return currentFollows;
                }

                return currentFollows.filter(item => item.id !== unfollowedActor.id);
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
        onSuccess(followedActor, fullHandle) {
            // Update the "isFollowing" property of the profile stored in the profile query cache
            const profileQueryKey = QUERY_KEYS.profile(fullHandle);

            queryClient.setQueryData(profileQueryKey, (currentProfile: unknown) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    isFollowing: true
                };
            });

            // Add the followed actor to the profile following query cache
            const profileFollowingQueryKey = QUERY_KEYS.profileFollowing('index');

            queryClient.setQueryData(profileFollowingQueryKey, (currentFollowing?: unknown[]) => {
                if (!currentFollowing) {
                    return currentFollowing;
                }

                return [followedActor].concat(currentFollowing);
            });

            const accountFollowsQueryKey = QUERY_KEYS.accountFollows('index', 'following');

            // Invalidate the account follows query cache to ensure the followed actor is added
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
    const queryClient = useQueryClient();
    const queryKey = QUERY_KEYS.thread(id);

    const threadQuery = useQuery({
        queryKey,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.getThread(id);
        }
    });

    const addToThread = (activity: Activity) => {
        // Add the activity to the thread stored in the thread query cache
        queryClient.setQueryData(queryKey, (current: ActivityThread | undefined) => {
            if (!current) {
                return current;
            }

            return {
                items: [...current.items, activity]
            };
        });
    };

    return {threadQuery, addToThread};
}

export function useReplyMutationForUser(handle: string) {
    return useMutation({
        async mutationFn({id, content}: {id: string, content: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.reply(id, content);
        }
    });
}

export function useNoteMutationForUser(handle: string) {
    const queryClient = useQueryClient();

    return useMutation({
        async mutationFn({content}: {content: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);

            return api.note(content);
        },
        onSuccess: (activity: Activity) => {
            // Add the activity to the outbox query cache
            const outboxQueryKey = QUERY_KEYS.outbox(handle);

            queryClient.setQueryData(outboxQueryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (current === undefined) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}, index: number) => {
                        if (index === 0) {
                            return {
                                ...page,
                                data: [activity, ...page.data]
                            };
                        }

                        return page;
                    })
                };
            });

            // Update the activity stored in the activities query cache
            const activitiesQueryKey = QUERY_KEYS.activities(handle, GET_ACTIVITIES_QUERY_KEY_FEED);

            queryClient.setQueriesData(activitiesQueryKey, (current?: {pages: {data: Activity[]}[]}) => {
                if (current === undefined) {
                    return current;
                }

                return {
                    ...current,
                    pages: current.pages.map((page: {data: Activity[]}, index: number) => {
                        if (index === 0) {
                            return {
                                ...page,
                                data: [activity, ...page.data]
                            };
                        }

                        return page;
                    })
                };
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
