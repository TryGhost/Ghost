import {Activity} from '../components/activities/ActivityItem';
import {ActivityPubAPI, type ProfileSearchResult, type SearchResults} from '../api/activitypub';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export function useSiteUrl() {
    const site = useBrowseSite();
    return site.data?.site?.url ?? window.location.origin;
};

function createActivityPubAPI(handle: string, siteUrl: string) {
    return new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
}

export function useLikedForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`liked:${handle}`],
        async queryFn() {
            return api.getLiked();
        }
    });
}

export function useReplyMutationForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useMutation({
        async mutationFn({id, content}: {id: string, content: string}) {
            return await api.reply(id, content) as Activity;
        }
    });
}

export function useLikeMutationForUser(handle: string) {
    const queryClient = useQueryClient();
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useMutation({
        mutationFn(id: string) {
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
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useMutation({
        mutationFn: (id: string) => {
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
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`user:${handle}`],
        async queryFn() {
            return api.getUser();
        }
    });
}

export function useFollowersCountForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`followersCount:${handle}`],
        async queryFn() {
            return api.getFollowersCount();
        }
    });
}

export function useFollowingCountForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`followingCount:${handle}`],
        async queryFn() {
            return api.getFollowingCount();
        }
    });
}

export function useFollowingForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`following:${handle}`],
        async queryFn() {
            return api.getFollowing();
        }
    });
}

export function useFollowersForUser(handle: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`followers:${handle}`],
        async queryFn() {
            return api.getFollowers();
        }
    });
}

export function useAllActivitiesForUser({
    handle,
    includeOwn = false,
    includeReplies = false,
    filter = null
}: {
    handle: string;
    includeOwn?: boolean;
    includeReplies?: boolean;
    filter?: {type?: string[]} | null;
}) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useQuery({
        queryKey: [`activities:${JSON.stringify({handle, includeOwn, includeReplies, filter})}`],
        async queryFn() {
            return api.getAllActivities(includeOwn, includeReplies, filter);
        }
    });
}

export function useActivitiesForUser({
    handle,
    includeOwn = false,
    includeReplies = false,
    filter = null
}: {
    handle: string;
    includeOwn?: boolean;
    includeReplies?: boolean;
    filter?: {type?: string[]} | null;
}) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useInfiniteQuery({
        queryKey: [`activities:${JSON.stringify({handle, includeOwn, includeReplies, filter})}`],
        async queryFn({pageParam}: {pageParam?: string}) {
            return api.getActivities(includeOwn, includeReplies, filter, pageParam);
        },
        getNextPageParam(prevPage) {
            return prevPage.nextCursor;
        }
    });
}

export function useSearchForUser(handle: string, query: string) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    const queryClient = useQueryClient();
    const queryKey = ['search', {handle, query}];

    const searchQuery = useQuery({
        enabled: query !== '',
        queryKey,
        async queryFn() {
            return api.search(query);
        }
    });

    const updateProfileSearchResult = (id: string, updated: Partial<ProfileSearchResult>) => {
        queryClient.setQueryData(queryKey, (current: SearchResults | undefined) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                profiles: current.profiles.map((item: ProfileSearchResult) => {
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

export function useFollow(handle: string, onSuccess: () => void, onError: () => void) {
    const siteUrl = useSiteUrl();
    const api = createActivityPubAPI(handle, siteUrl);
    return useMutation({
        async mutationFn(username: string) {
            return api.follow(username);
        },
        onSuccess,
        onError
    });
}

