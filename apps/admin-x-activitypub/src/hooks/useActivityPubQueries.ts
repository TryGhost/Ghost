import {
    type AccountFollowsType,
    ActivityPubAPI,
    ActivityPubCollectionResponse,
    ActivityThread,
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

let SITE_URL: string;

export type ActivityPubCollectionQueryResult<TData> = UseInfiniteQueryResult<ActivityPubCollectionResponse<TData>>;
export type AccountFollowsQueryResult = UseInfiniteQueryResult<GetAccountFollowsResponse>;

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

export function useOutboxForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: [`outbox:${handle}`],
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
        queryKey: [`liked:${handle}`],
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
            const previousInbox = queryClient.getQueryData([`inbox:${handle}`]);
            if (previousInbox) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                queryClient.setQueryData([`inbox:${handle}`], (old?: any[]) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return old?.map((item: any) => {
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
                    });
                });
            }

            // This sets the context for the onError handler
            return {previousInbox};
        },
        onError: (_err, _id, context) => {
            if (context?.previousInbox) {
                queryClient.setQueryData([`inbox:${handle}`], context?.previousInbox);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: [`liked:${handle}`]});
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
        onMutate: async (id) => {
            const previousInbox = queryClient.getQueryData([`inbox:${handle}`]);
            const previousLiked = queryClient.getQueryData([`liked:${handle}`]);

            if (previousInbox) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                queryClient.setQueryData([`inbox:${handle}`], (old?: any[]) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return old?.map((item: any) => {
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
                    });
                });
            }
            if (previousLiked) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                queryClient.setQueryData([`liked:${handle}`], (old?: any[]) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return old?.filter((item: any) => item.object.id !== id);
                });
            }

            // This sets the context for the onError handler
            return {previousInbox, previousLiked};
        },
        onError: (_err, _id, context) => {
            if (context?.previousInbox) {
                queryClient.setQueryData([`inbox:${handle}`], context?.previousInbox);
            }
            if (context?.previousLiked) {
                queryClient.setQueryData([`liked:${handle}`], context?.previousLiked);
            }
        }
    });
}

export function useUserDataForUser(handle: string) {
    return useQuery({
        queryKey: [`user:${handle}`],
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getUser();
        }
    });
}

export function useFollowersForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: [`followers:${handle}`],
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getFollowers(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useFollowingForUser(handle: string) {
    return useInfiniteQuery({
        queryKey: [`following:${handle}`],
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getFollowing(pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useFollow(handle: string, onSuccess: () => void, onError: () => void) {
    const queryClient = useQueryClient();
    return useMutation({
        async mutationFn(username: string) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.follow(username);
        },
        onSuccess(followedActor, fullHandle) {
            queryClient.setQueryData([`profile:${fullHandle}`], (currentProfile: unknown) => {
                if (!currentProfile) {
                    return currentProfile;
                }
                return {
                    ...currentProfile,
                    isFollowing: true
                };
            });

            queryClient.setQueryData(['following:index'], (currentFollowing?: unknown[]) => {
                if (!currentFollowing) {
                    return currentFollowing;
                }
                return [followedActor].concat(currentFollowing);
            });

            queryClient.setQueryData(['followingCount:index'], (currentFollowingCount?: number) => {
                if (!currentFollowingCount) {
                    return 1;
                }
                return currentFollowingCount + 1;
            });

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
    const queryKey = [`activities:${handle}`, key, {includeOwn, includeReplies, filter}];
    const queryClient = useQueryClient();

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
    const queryKey = ['search', {handle, query}];

    const searchQuery = useQuery({
        queryKey,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.search(query);
        }
    });

    const updateProfileSearchResult = (id: string, updated: Partial<Profile>) => {
        queryClient.setQueryData(queryKey, (current: SearchResults | undefined) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                profiles: current.profiles.map((item: Profile) => {
                    if (item.actor.id === id) {
                        return {...item, ...updated};
                    }
                    return item;
                })
            };
        });
    };

    return {searchQuery, updateProfileSearchResult};
}

export function useSuggestedProfiles(handle: string, limit = 3) {
    const queryClient = useQueryClient();
    const queryKey = ['profiles', limit];

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

export function useProfileForUser(handle: string, fullHandle: string, enabled: boolean = true) {
    return useQuery({
        queryKey: [`profile:${fullHandle}`],
        enabled,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getProfile(fullHandle);
        }
    });
}

export function usePostsForProfile(handle: string) {
    return useInfiniteQuery({
        queryKey: [`posts:${handle}`],
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getPostsForProfile(handle, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useFollowersForProfile(handle: string) {
    return useInfiniteQuery({
        queryKey: [`followers:${handle}`],
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getFollowersForProfile(handle, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useFollowingForProfile(handle: string) {
    return useInfiniteQuery({
        queryKey: [`following:${handle}`],
        async queryFn({pageParam}: {pageParam?: string}) {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getFollowingForProfile(handle, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.next;
        }
    });
}

export function useThreadForUser(handle: string, id: string) {
    const queryClient = useQueryClient();
    const queryKey = ['thread', {id}];

    const threadQuery = useQuery({
        queryKey,
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getThread(id);
        }
    });

    const addToThread = (activity: Activity) => {
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
            queryClient.setQueryData([`outbox:${handle}`], (current?: {pages: {data: Activity[]}[]}) => {
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

            queryClient.setQueriesData([`activities:${handle}`, GET_ACTIVITIES_QUERY_KEY_FEED], (current?: {pages: {data: Activity[]}[]}) => {
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
        queryKey: [`account:${handle}`],
        async queryFn() {
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI(handle, siteUrl);
            return api.getAccount();
        }
    });
}

export function useAccountFollowsForUser(handle: string, type: AccountFollowsType) {
    return useInfiniteQuery({
        queryKey: [`follows:${handle}:${type}`],
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
